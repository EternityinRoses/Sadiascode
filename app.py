"""
Cloude: a small local chat agent for Claude, with a cute web UI.

Run it with `python app.py`, then open http://127.0.0.1:8640 (it opens itself).
Everything lives in this folder: the code, the chats, your uploads, and the
backups Cloude makes before it edits its own files.

Cloude can read and edit the files in this folder, so it can grow itself:
ask it for a feature, it edits app.py / static/*, and you press Restart.
Shell commands wait for you to press Allow, unless you turn on auto-run.

Three "brains", each spending a different pool of credit:
  api    your API key (API credits), streamed here, with Cloude's own tools
  code   the `claude` program on this PC (Claude Code), streamed here
  cloud  a Claude Code cloud session; replies appear in the Claude app
"""

import base64
import fnmatch
import hashlib
import json
import mimetypes
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import uuid
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

import anthropic

APP_DIR = Path(__file__).resolve().parent
STATIC_DIR = APP_DIR / "static"
CHATS_DIR = APP_DIR / "chats"
UPLOADS_DIR = APP_DIR / "uploads"
BACKUPS_DIR = APP_DIR / ".backups"
CONFIG_FILE = APP_DIR / "config.json"
SYSTEM_FILE = APP_DIR / "system_prompt.md"
MEMORY_FILE = APP_DIR / "memory.md"

HOST = "127.0.0.1"          # only this computer can reach it
PORT = int(os.environ.get("CLOUDE_PORT", "8640"))

DEFAULTS = {
    "model": "claude-opus-5-5",
    "effort": "medium",
    "max_tokens": 32000,
    "auto_approve": False,   # True: commands run without the Allow / Deny card
    "brain": "api",          # api (API credits) | code (Claude Code on this PC) | cloud (cloud sessions)
    "git_sync": True,        # share memory.md through GitHub when Cloude lives in a git clone
    "compact_at": 100000,    # API brain: summarize older messages once a chat reaches this many tokens (min 50000)
    "cache_ttl": "1h",       # API brain: how long the sent chat stays cheap to resend ("5m" or "1h")
    "auto_update": True,     # pull new versions from GitHub by itself and restart
    "cloud_scry": True,      # let the cloud session read files here (read-only, approved folders only)
    "seat_brain": "api",     # who plays the game seat: "api" (here, API credits) or "cloud" (the cloud session)
    # Folders outside Cloude's home that its file tools may also reach (approved by the user).
    "extra_roots": [r"D:\Sadias Canvas"],
}
BRAINS = ("api", "code", "cloud")
MAX_TOOL_ROUNDS = 30        # tool calls Cloude may chain for one message
IMAGE_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp"}
IMAGE_LIMIT = 5 * 1024 * 1024          # the API's per-image size limit
TEXT_LIMIT = 400 * 1024                # bigger text files are attached by path only
UPLOAD_LIMIT = 30 * 1024 * 1024
SECRET_FILES = {CONFIG_FILE.name}      # never read back to the model: holds the API key

for d in (CHATS_DIR, UPLOADS_DIR, BACKUPS_DIR):
    d.mkdir(exist_ok=True)


# ---------------------------------------------------------------- settings --

def load_config():
    cfg = dict(DEFAULTS)
    try:
        cfg.update(json.loads(CONFIG_FILE.read_text(encoding="utf-8")))
    except (OSError, ValueError):
        pass
    return cfg


def save_config(cfg):
    CONFIG_FILE.write_text(json.dumps(cfg, indent=2), encoding="utf-8")


def api_key():
    return load_config().get("api_key") or os.environ.get("ANTHROPIC_API_KEY", "")


def make_client():
    key = api_key()
    if not key:
        raise RuntimeError("No API key yet. Click the gear and paste your key.")
    return anthropic.Anthropic(api_key=key)


# ------------------------------------------------------------------- tools --

TOOLS = [
    {
        "name": "list_files",
        "description": "List files and folders inside Cloude's own folder. "
                       "Paths are relative to that folder; '.' is the top.",
        "input_schema": {
            "type": "object",
            "properties": {"path": {"type": "string", "description": "Folder to list, default '.'"}},
            "required": [],
        },
    },
    {
        "name": "read_file",
        "description": "Read a text file inside Cloude's own folder.",
        "input_schema": {
            "type": "object",
            "properties": {"path": {"type": "string"}},
            "required": ["path"],
        },
    },
    {
        "name": "write_file",
        "description": "Create or overwrite a text file inside Cloude's own folder. "
                       "The previous version is backed up automatically.",
        "eager_input_streaming": True,
        "input_schema": {
            "type": "object",
            "properties": {"path": {"type": "string"}, "content": {"type": "string"}},
            "required": ["path", "content"],
        },
    },
    {
        "name": "edit_file",
        "description": "Replace one exact, unique piece of text in a file inside "
                       "Cloude's own folder. Use for small changes to big files.",
        "eager_input_streaming": True,
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "old_text": {"type": "string", "description": "Must appear exactly once"},
                "new_text": {"type": "string"},
            },
            "required": ["path", "old_text", "new_text"],
        },
    },
    {
        "name": "run_command",
        "description": "Run a shell command in Cloude's folder (for example "
                       "'pip install requests' or 'python -m py_compile app.py'). "
                       "The user must press Allow first, and may deny it.",
        "input_schema": {
            "type": "object",
            "properties": {"command": {"type": "string"}},
            "required": ["command"],
        },
    },
    {
        "name": "list_chats",
        "description": "List the user's other Cloude chats (short id, brain, title), so you can talk to them "
                       "with tell_chat. Other chats may be other brains: cloud, Claude Code or API.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "tell_chat",
        "description": "Send a message to another Cloude chat (by its short id from list_chats). That chat's "
                       "own brain answers it, and the answer comes back into THIS chat as a 📨 reply (you'll "
                       "see it with the user's next message). Use it to ask what another chat did, e.g. which "
                       "game files it edited, instead of guessing. Ask for a short summary.",
        "input_schema": {
            "type": "object",
            "properties": {"chat": {"type": "string", "description": "the other chat's short id"},
                           "message": {"type": "string"}},
            "required": ["chat", "message"],
        },
    },
]


class ToolError(Exception):
    pass


def allowed_roots():
    roots = [APP_DIR]
    for r in load_config().get("extra_roots") or []:
        try:
            roots.append(Path(r).resolve())
        except (OSError, ValueError):
            pass
    return roots


def safe_path(rel):
    """Resolve a model-supplied path (relative to APP_DIR, or absolute) and refuse
    anything outside APP_DIR and the user-approved extra_roots."""
    if not isinstance(rel, str) or not rel.strip():
        rel = "."
    target = (APP_DIR / rel).resolve()
    if not any(target.is_relative_to(r) for r in allowed_roots()):
        raise ToolError("That path is outside my folder and the approved folders.")
    return target


def shown_path(target):
    return str(target.relative_to(APP_DIR)) if target.is_relative_to(APP_DIR) else str(target)


def backup(target):
    if target.is_file():
        stamp = time.strftime("%Y%m%d-%H%M%S")
        flat = re.sub(r"[\\/:]+", "__", shown_path(target)).strip("_")
        shutil.copy2(target, BACKUPS_DIR / f"{stamp}__{flat}")


def tool_list_files(args):
    target = safe_path(args.get("path", "."))
    if not target.is_dir():
        raise ToolError("Not a folder.")
    rows = []
    for p in sorted(target.iterdir()):
        if p.name in (".backups", "__pycache__", "chats"):
            rows.append(p.name + "/  (skipped)")
            continue
        rows.append(p.name + ("/" if p.is_dir() else f"  ({p.stat().st_size} bytes)"))
    return "\n".join(rows) or "(empty)"


def tool_read_file(args):
    target = safe_path(args["path"])
    if target.name in SECRET_FILES:
        raise ToolError("That file holds the API key, so I don't read it.")
    if not target.is_file():
        raise ToolError("No such file.")
    data = target.read_bytes()
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        raise ToolError(f"Binary file ({len(data)} bytes), can't show it as text.")
    if len(text) > 200_000:
        text = text[:200_000] + "\n... (cut off, file is longer)"
    return text


def tool_write_file(args):
    target = safe_path(args["path"])
    if target.name in SECRET_FILES:
        raise ToolError("I don't overwrite the API key file.")
    target.parent.mkdir(parents=True, exist_ok=True)
    backup(target)
    target.write_text(args["content"], encoding="utf-8")
    return f"Wrote {shown_path(target)} ({len(args['content'])} chars)."


def tool_edit_file(args):
    target = safe_path(args["path"])
    if target.name in SECRET_FILES:
        raise ToolError("I don't edit the API key file.")
    if not target.is_file():
        raise ToolError("No such file.")
    text = target.read_text(encoding="utf-8")
    count = text.count(args["old_text"])
    if count != 1:
        raise ToolError(f"old_text appears {count} times; it must appear exactly once.")
    backup(target)
    target.write_text(text.replace(args["old_text"], args["new_text"], 1), encoding="utf-8")
    return f"Edited {shown_path(target)}."


def tool_run_command(args):
    try:
        done = subprocess.run(args["command"], shell=True, cwd=APP_DIR, capture_output=True,
                              text=True, timeout=300)
    except subprocess.TimeoutExpired:
        raise ToolError("The command took longer than 5 minutes and was stopped.")
    out = (done.stdout or "") + (("\n[stderr]\n" + done.stderr) if done.stderr else "")
    if len(out) > 20_000:
        out = out[:20_000] + "\n... (output cut off)"
    return f"exit code {done.returncode}\n{out}".strip()


TOOL_FUNCS = {
    "list_files": tool_list_files,
    "read_file": tool_read_file,
    "write_file": tool_write_file,
    "edit_file": tool_edit_file,
    "run_command": tool_run_command,
    "list_chats": lambda args, chat=None: chats_overview(skip=chat and chat["id"]),
    "tell_chat": lambda args, chat=None: tell_chat(chat["id"], args.get("chat"), args.get("message", "")),
}
CHAT_TOOLS = {"list_chats", "tell_chat"}
STOPS = set()          # chat ids whose answer the user stopped (checked between steps)       # these need to know which chat is asking


def valid_input(name, args, schema):
    """Eager-streamed inputs aren't validated by the API, so check them here."""
    if not isinstance(args, dict):
        return False
    props = schema.get("properties", {})
    for key in schema.get("required", []):
        if not isinstance(args.get(key), str):
            return False
    return all(isinstance(args[k], str) for k in args if k in props)


# Approvals for run_command: the stream waits here until the user answers.
APPROVALS = {}
APPROVAL_LOCK = threading.Lock()


def wait_for_approval(approval_id, timeout=600):
    with APPROVAL_LOCK:
        slot = APPROVALS.setdefault(approval_id, {"event": threading.Event(), "ok": False})
    slot["event"].wait(timeout)
    with APPROVAL_LOCK:
        APPROVALS.pop(approval_id, None)
    return slot["ok"]


# ------------------------------------------------------------------- chats --

def chat_path(chat_id):
    if not re.fullmatch(r"[a-f0-9]{32}", chat_id or ""):
        raise ValueError("bad chat id")
    return CHATS_DIR / f"{chat_id}.json"


def build_system():
    """The personality plus the memory notes, as they stand when a chat starts."""
    parts = []
    if SYSTEM_FILE.exists():
        parts.append(SYSTEM_FILE.read_text(encoding="utf-8"))
    if MEMORY_FILE.exists():
        parts.append("# Your memory (memory.md, as of the start of this chat)\n\n"
                     + MEMORY_FILE.read_text(encoding="utf-8"))
    return "\n\n".join(parts)


def transcript(chat):
    """The conversation as plain text (no thinking), for handing to another brain."""
    lines = []
    for d in chat.get("display", []):
        who = "User" if d.get("role") == "user" else "Cloude"
        files = ", ".join(f["name"] for f in d.get("files") or [])
        text = (d.get("text") or "").strip()
        if files:
            text = f"[attached: {files}] {text}".strip()
        if text:
            lines.append(f"{who}: {text}")
    return "\n\n".join(lines)


def with_handoff(chat, user_text, limit):
    """Put the conversation carried over from another brain in front of the
    first message of this chat (once), trimmed to the most recent `limit` chars."""
    carried = chat.pop("handoff", "")
    if not carried:
        return user_text
    if len(carried) > limit:
        carried = "(…earlier part cut…)\n\n" + carried[-limit:]
    return ("We're continuing a conversation the user started with you on another of "
            "Cloude's brains. Here it is for context:\n\n<earlier_conversation>\n"
            f"{carried}\n</earlier_conversation>\n\nTheir new message:\n{user_text}")


def new_chat(handoff=""):
    # The system prompt and tool list are frozen per chat: the API rejects
    # replayed thinking blocks if either changes under an existing conversation.
    # So when Cloude edits its own prompt or tools, it shows up in new chats.
    cfg = load_config()
    if cfg.get("git_sync"):
        pull_memory()                    # pick up notes the other brains left
    chat = {
        "id": uuid.uuid4().hex,
        "title": "New chat",
        "created": time.time(),
        "brain": cfg["brain"] if cfg["brain"] in BRAINS else "api",
        "system": build_system(),
        "tools": TOOLS,
        "messages": [],     # exactly what is sent to the API, append-only
        "display": [],      # what the page shows
    }
    if handoff:
        chat["handoff"] = handoff   # conversation carried over from another brain
    save_chat(chat)
    return chat


def load_chat(chat_id):
    return json.loads(chat_path(chat_id).read_text(encoding="utf-8"))


def save_chat(chat):
    tmp = chat_path(chat["id"]).with_suffix(".tmp")
    tmp.write_text(json.dumps(chat), encoding="utf-8")
    tmp.replace(chat_path(chat["id"]))


def list_chats():
    rows = []
    for p in CHATS_DIR.glob("*.json"):
        try:
            c = json.loads(p.read_text(encoding="utf-8"))
            rows.append({"id": c["id"], "title": c["title"], "created": c["created"],
                         "brain": c.get("brain", "api")})
        except (OSError, ValueError, KeyError):
            continue
    return sorted(rows, key=lambda r: r["created"], reverse=True)


# ----------------------------------------------------------------- uploads --

def save_upload(name, mime, data_b64):
    raw = base64.b64decode(data_b64)
    if len(raw) > UPLOAD_LIMIT:
        raise ValueError("That file is bigger than 30 MB.")
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", name)[-80:] or "file"
    stored = f"{uuid.uuid4().hex[:8]}_{safe}"
    (UPLOADS_DIR / stored).write_bytes(raw)
    mime = mime or mimetypes.guess_type(name)[0] or "application/octet-stream"
    kind = "image" if mime in IMAGE_TYPES else "file"
    return {"id": stored, "name": name, "mime": mime, "kind": kind,
            "size": len(raw), "url": f"/uploads/{stored}"}


def attachment_blocks(att):
    """Turn one uploaded file into content blocks for the API."""
    path = UPLOADS_DIR / att["id"]
    raw = path.read_bytes()
    where = f"uploads/{att['id']}"
    mime = att.get("mime", "")
    if mime in IMAGE_TYPES and len(raw) <= IMAGE_LIMIT:
        return [
            {"type": "text", "text": f"[Picture: {att['name']}, saved at {where}]"},
            {"type": "image", "source": {"type": "base64", "media_type": mime,
                                         "data": base64.standard_b64encode(raw).decode()}},
        ]
    if mime == "application/pdf" and len(raw) <= 30 * 1024 * 1024:
        return [
            {"type": "text", "text": f"[PDF: {att['name']}, saved at {where}]"},
            {"type": "document", "title": att["name"],
             "source": {"type": "base64", "media_type": "application/pdf",
                        "data": base64.standard_b64encode(raw).decode()}},
        ]
    if len(raw) <= TEXT_LIMIT:
        try:
            text = raw.decode("utf-8")
            return [{"type": "text",
                     "text": f"[File: {att['name']}, saved at {where}]\n```\n{text}\n```"}]
        except UnicodeDecodeError:
            pass
    return [{"type": "text", "text": f"[File: {att['name']} ({mime}, {len(raw)} bytes), "
                                     f"saved at {where}. It's too big or not text, so "
                                     f"only the path is shared.]"}]


# -------------------------------------------------------------- agent loop --

def clean_assistant_content(blocks):
    """After a mid-answer model fallback, drop model-internal blocks that came
    before the switch point; the API docs say not to echo those back."""
    last_fb = max((i for i, b in enumerate(blocks) if b.get("type") == "fallback"), default=-1)
    if last_fb < 0:
        return blocks
    drop = {"thinking", "redacted_thinking", "tool_use", "server_tool_use"}
    return [b for i, b in enumerate(blocks) if i > last_fb or b.get("type") not in drop]


def log_user(chat, user_text, attachments):
    chat["display"].append({"role": "user", "text": user_text,
                            "files": [{k: a[k] for k in ("name", "kind", "url")} for a in attachments]})
    if chat["title"] == "New chat":
        chat["title"] = (user_text or (attachments[0]["name"] if attachments else "Chat"))[:48]
    save_chat(chat)


def run_turn(chat, user_text, attachments, emit, display_text=None, game=False, extra_blocks=None):
    """Send one user message and keep going through tool calls. `emit(dict)`
    streams events to the page. game=True: a turn the game sent (no shell commands)."""
    cfg = load_config()
    client = make_client()

    content = list(extra_blocks or [])
    for att in attachments:
        content.extend(attachment_blocks(att))
    mail = [] if game else chat.pop("inbox", [])     # replies other chats sent while it was quiet
    model_text = with_handoff(chat, ("\n\n".join(mail) + "\n\n---\n\n" if mail else "") + user_text, 120_000)
    if model_text:
        content.append({"type": "text", "text": model_text})
    if not content:
        return
    start_len = len(chat["messages"])
    chat["messages"].append({"role": "user", "content": content})
    log_user(chat, display_text or user_text, attachments)
    if game:
        chat["display"][-1]["game"] = True

    shown = {"role": "assistant", "text": "", "thoughts": "", "tools": []}
    if game:
        shown["game"] = True
    schemas = {t["name"]: t["input_schema"] for t in chat["tools"]}
    cache = {"type": "ephemeral", "ttl": "1h"} if cfg.get("cache_ttl") == "1h" else {"type": "ephemeral"}
    compact_at = max(50000, int(cfg.get("compact_at") or 100000))
    json_retries = 0

    STOPS.discard(chat["id"])
    try:
        for _ in range(MAX_TOOL_ROUNDS):
            if chat["id"] in STOPS:
                emit({"type": "notice", "text": "Stopped."})
                break
            new_round = True
            try:
                with client.beta.messages.stream(
                    model=cfg["model"],
                    max_tokens=int(cfg["max_tokens"]),
                    # Its own cache breakpoint, so the system prompt stays cached
                    # even after compaction replaces the older messages.
                    system=[{"type": "text", "text": chat["system"], "cache_control": cache}]
                           if chat["system"] else anthropic.omit,
                    tools=chat["tools"],
                    messages=chat["messages"],
                    thinking={"type": "adaptive", "display": "summarized"},
                    output_config={"effort": cfg["effort"]},
                    cache_control=cache,
                    # Once the chat gets long, the API summarizes the older part
                    # and only the summary is counted from then on.
                    context_management={"edits": [{
                        "type": "compact_20260112",
                        "trigger": {"type": "input_tokens", "value": compact_at},
                    }]},
                    # If a safety check declines, Anthropic retries on its
                    # recommended model instead of just stopping.
                    betas=["server-side-fallback-2026-07-01", "compact-2026-01-12"],
                    fallbacks="default",
                ) as stream:
                    for event in stream:
                        if event.type == "thinking":
                            shown["thoughts"] += event.thinking
                            emit({"type": "thinking", "text": event.thinking})
                        elif event.type == "text":
                            piece = event.text
                            if new_round and shown["text"]:
                                piece = "\n\n" + piece      # keep rounds apart
                            new_round = False
                            shown["text"] += piece
                            emit({"type": "text", "text": piece})
                        elif event.type == "content_block_start":
                            kind = event.content_block.type
                            if kind == "tool_use":
                                emit({"type": "tool_start", "name": event.content_block.name})
                            elif kind == "fallback":
                                emit({"type": "notice", "text": "Switched to a backup model for this answer."})
                            elif kind == "compaction":
                                emit({"type": "notice", "text": "🧹 This chat got long, so I summarized the "
                                                                "older part to keep it cheap."})
                    final = stream.get_final_message()
                json_retries = 0
            except ValueError:
                # Tool input JSON the SDK couldn't parse: ask again (bounded).
                json_retries += 1
                if json_retries > 2:
                    raise
                continue

            blocks = clean_assistant_content(
                [b.to_dict(mode="json") for b in final.content])

            if final.stop_reason == "refusal":
                emit({"type": "notice", "text": "Claude declined to answer that one."})
                if len(chat["messages"]) == start_len + 1:
                    chat["messages"].pop()      # nothing usable came back; forget the ask
                break
            if not blocks:
                break
            chat["messages"].append({"role": "assistant", "content": blocks})

            if final.stop_reason == "pause_turn":
                continue
            tool_uses = [b for b in blocks if b.get("type") == "tool_use"]
            if final.stop_reason != "tool_use" or not tool_uses:
                if final.stop_reason == "max_tokens":
                    emit({"type": "notice", "text": "That answer hit the length limit."})
                break

            results = []
            for tu in tool_uses:
                name, args = tu["name"], tu.get("input") or {}
                label = args.get("path") or args.get("command") or ""
                record = {"name": name, "label": label, "ok": True}
                try:
                    if chat["id"] in STOPS:
                        raise ToolError("The user pressed Stop, so this didn't run.")
                    if name not in TOOL_FUNCS:
                        raise ToolError(f"Unknown tool {name}.")
                    if not valid_input(name, args, schemas.get(name, {})):
                        raise ToolError("The tool input came through garbled; please try again.")
                    if name == "run_command" and game:
                        raise ToolError("Shell commands are off during game turns.")
                    if name == "run_command" and cfg.get("auto_approve"):
                        emit({"type": "notice", "text": f"Auto-allowed: {args['command']}"})
                    elif name == "run_command":
                        approval_id = uuid.uuid4().hex
                        with APPROVAL_LOCK:
                            APPROVALS[approval_id] = {"event": threading.Event(), "ok": False}
                        emit({"type": "approve", "id": approval_id, "command": args["command"]})
                        if not wait_for_approval(approval_id):
                            raise ToolError("The user said no to running that command.")
                    if name in CHAT_TOOLS and game:
                        raise ToolError("Not during game turns.")
                    out = (TOOL_FUNCS[name](args, chat) if name in CHAT_TOOLS else TOOL_FUNCS[name](args))
                    results.append({"type": "tool_result", "tool_use_id": tu["id"], "content": out})
                except ToolError as e:
                    record["ok"] = False
                    results.append({"type": "tool_result", "tool_use_id": tu["id"],
                                    "content": str(e), "is_error": True})
                except Exception as e:      # a tool crashing must not wedge the chat
                    record["ok"] = False
                    results.append({"type": "tool_result", "tool_use_id": tu["id"],
                                    "content": f"{type(e).__name__}: {e}", "is_error": True})
                shown["tools"].append(record)
                emit({"type": "tool_done", **record})
            chat["messages"].append({"role": "user", "content": results})
            save_chat(chat)
        else:
            emit({"type": "notice", "text": "Stopped after a lot of tool steps. Say 'keep going' to continue."})
    except anthropic.AuthenticationError:
        emit({"type": "error", "text": "The API key was rejected. Check it in settings."})
        _drop_unanswered(chat, start_len)
    except anthropic.NotFoundError:
        emit({"type": "error", "text": f"Model '{cfg['model']}' wasn't found for this key."})
        _drop_unanswered(chat, start_len)
    except anthropic.RateLimitError:
        emit({"type": "error", "text": "Rate limited or out of credit. Wait a bit and try again."})
        _drop_unanswered(chat, start_len)
    except anthropic.APIStatusError as e:
        emit({"type": "error", "text": f"API error {e.status_code}: {e.message}"})
        _drop_unanswered(chat, start_len)
    except anthropic.APIConnectionError:
        emit({"type": "error", "text": "Couldn't reach the API. Check your internet."})
        _drop_unanswered(chat, start_len)
    finally:
        if shown["text"] or shown["thoughts"] or shown["tools"]:
            chat["display"].append(shown)
        save_chat(chat)


def _drop_unanswered(chat, start_len):
    """If the very first request failed, take the user's message back out of the
    API history (nothing answered it), so the chat stays clean to retry."""
    if len(chat["messages"]) == start_len + 1:
        chat["messages"].pop()



# ------------------------------------------------- the other two brains --

CODE_PREFACE = """You're running through Claude Code on the user's PC this time, not the API.
Use Claude Code's own tools (Read, Write, Edit, Bash, and so on) instead of
list_files / read_file / write_file / edit_file / run_command. Your working
folder is Cloude's folder, and files the user attaches are in uploads/."""


def find_claude():
    return shutil.which("claude")


def code_system_text():
    """Personality + memory for the Claude Code brain. If the repo's CLAUDE.md
    already pulls in memory.md, Claude Code loads it by itself, so skip it here."""
    parts = [CODE_PREFACE]
    if SYSTEM_FILE.exists():
        parts.append(SYSTEM_FILE.read_text(encoding="utf-8"))
    root_md = APP_DIR / "CLAUDE.md"
    has_import = root_md.exists() and "@memory.md" in root_md.read_text(encoding="utf-8", errors="ignore")
    if MEMORY_FILE.exists() and not has_import:
        parts.append("# Your memory (memory.md)\n\n" + MEMORY_FILE.read_text(encoding="utf-8"))
    return "\n\n".join(parts)


def short_label(name, args):
    if not isinstance(args, dict):
        return ""
    for key in ("file_path", "path", "command", "pattern", "url", "description"):
        if isinstance(args.get(key), str):
            return args[key]
    return ""


def run_turn_code(chat, user_text, attachments, emit):
    """One message through `claude -p` on this PC (Claude Code), streamed back."""
    exe = find_claude()
    if not exe:
        raise RuntimeError("I couldn't find the `claude` program. Install Claude Code, run "
                           "`claude auth login`, then try again, or switch my brain in settings.")
    cfg = load_config()
    prompt = with_handoff(chat, user_text, 120_000)
    if attachments:
        prompt += "\n\nAttached files (open them with the Read tool):\n" + "\n".join(
            f"- uploads/{a['id']}  ({a['name']})" for a in attachments)
    log_user(chat, user_text, attachments)

    sys_file = APP_DIR / ".cloude_system.txt"
    sys_file.write_text(code_system_text(), encoding="utf-8")
    args = [exe, "-p", "--output-format", "stream-json", "--verbose", "--include-partial-messages",
            "--model", cfg["model"], "--effort", cfg["effort"],
            "--append-system-prompt-file", str(sys_file),
            "--permission-mode", "bypassPermissions" if cfg.get("auto_approve") else "acceptEdits"]
    if chat.get("cc_session"):
        args += ["--resume", chat["cc_session"]]

    shown = {"role": "assistant", "text": "", "thoughts": "", "tools": []}
    pending_tools = {}                       # tool_use id -> (name, label)
    got_result = False
    proc = subprocess.Popen(args, cwd=APP_DIR, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="replace")
    err_lines = []
    threading.Thread(target=lambda: err_lines.extend(proc.stderr), daemon=True).start()
    try:
        proc.stdin.write(prompt)             # the message goes in on stdin, never through a shell
        proc.stdin.close()
        new_round = False
        STOPS.discard(chat["id"])
        for line in proc.stdout:
            if chat["id"] in STOPS:          # the user pressed Stop
                proc.kill()
                emit({"type": "notice", "text": "Stopped."})
                break
            try:
                ev = json.loads(line)
            except ValueError:
                continue
            kind = ev.get("type")
            if ev.get("session_id"):
                chat["cc_session"] = ev["session_id"]
            if ev.get("parent_tool_use_id"):
                continue                     # a helper agent's inner chatter
            if kind == "stream_event":
                e = ev.get("event") or {}
                if e.get("type") == "message_start":
                    new_round = True
                elif e.get("type") == "content_block_start":
                    block = e.get("content_block") or {}
                    if block.get("type") == "tool_use":
                        emit({"type": "tool_start", "name": block.get("name", "tool")})
                elif e.get("type") == "content_block_delta":
                    d = e.get("delta") or {}
                    if d.get("type") == "text_delta":
                        piece = d.get("text", "")
                        if new_round and shown["text"]:
                            piece = "\n\n" + piece
                        new_round = False
                        shown["text"] += piece
                        emit({"type": "text", "text": piece})
                    elif d.get("type") == "thinking_delta":
                        shown["thoughts"] += d.get("thinking", "")
                        emit({"type": "thinking", "text": d.get("thinking", "")})
            elif kind == "assistant":
                for b in (ev.get("message") or {}).get("content") or []:
                    if b.get("type") == "tool_use":
                        pending_tools[b.get("id")] = (b.get("name", "tool"), short_label(b.get("name"), b.get("input")))
            elif kind == "user":
                content = (ev.get("message") or {}).get("content")
                for b in content if isinstance(content, list) else []:
                    if b.get("type") == "tool_result" and b.get("tool_use_id") in pending_tools:
                        name, label = pending_tools.pop(b["tool_use_id"])
                        record = {"name": name, "label": label, "ok": not b.get("is_error")}
                        shown["tools"].append(record)
                        emit({"type": "tool_done", **record})
            elif kind == "result":
                got_result = True
                if ev.get("is_error") or ev.get("subtype") != "success":
                    emit({"type": "error", "text": "Claude Code stopped: "
                          + str(ev.get("result") or ev.get("subtype") or "unknown error")})
                denied = ev.get("permission_denials") or []
                if denied:
                    names = ", ".join(sorted({d.get("tool_name", "?") for d in denied}))
                    emit({"type": "notice", "text": f"Claude Code wasn't allowed to use: {names}. "
                                                    "Turn on auto-run in settings to let it."})
                if isinstance(ev.get("total_cost_usd"), (int, float)):
                    emit({"type": "notice", "text": f"About ${ev['total_cost_usd']:.3f} of Claude Code credit."})
        proc.wait()
        if not got_result:
            tail = "".join(err_lines)[-600:].strip()
            emit({"type": "error", "text": "Claude Code didn't finish" + (f": {tail}" if tail else ".")})
    finally:
        if proc.poll() is None:
            proc.kill()
        if shown["text"] or shown["thoughts"] or shown["tools"]:
            chat["display"].append(shown)
        save_chat(chat)


SESSION_RE = re.compile(r"(?:claude\.ai/code/)?\b((?:session|cse)_[A-Za-z0-9]+)")


CLOUD_OPENER = ("Hi! I'm Cloude, the user's local chat app on their PC. I'll pass their "
                "messages to you from here on, so please wait for the next one.")


def open_cloud_terminal(exe, root):
    """`claude --cloud` only starts a session from a real terminal, so open one.
    It shows the session link, and the session's replies, as they come.
    Returns False where we can't pop a window (then the user runs it by hand)."""
    if os.name != "nt":
        return False
    try:
        subprocess.Popen([exe, "--cloud", CLOUD_OPENER], cwd=root,
                         creationflags=subprocess.CREATE_NEW_CONSOLE)
        return True
    except OSError:
        return False


def cloud_send(exe, root, session, message):
    """Queue one message into an existing cloud session (works without a terminal)."""
    done = subprocess.run([exe, "-p", "--cloud", session, "--output-format", "json"],
                          cwd=root, input=message, capture_output=True, text=True,
                          encoding="utf-8", errors="replace", timeout=120)
    try:
        res = json.loads(done.stdout)
    except ValueError:
        res = {"ok": False, "error": (done.stdout + done.stderr).strip()[-600:]}
    if not res.get("ok"):
        raise RuntimeError("Couldn't reach the cloud session: " + str(res.get("error")))


def sync_cloud_settings(exe, root, chat):
    """Pass ⚙'s model and effort on to the cloud session as Claude Code commands,
    whenever they differ from what this chat last sent."""
    cfg = load_config()
    for key, cmd in (("model", "/model"), ("effort", "/effort")):
        want = cfg.get(key)
        if want and chat.get(f"cloud_{key}") != want:
            try:
                cloud_send(exe, root, chat["cloud_session"], f"{cmd} {want}")
                chat[f"cloud_{key}"] = want
            except RuntimeError:
                pass                                # not fatal: the message still goes


INBOX_BRANCH = "cloude-inbox"


def push_attachments(root, tag, attachments):
    """Put uploaded files on their own small branch so the cloud can fetch them
    without cluttering any work branch. Returns their paths there."""
    with _mailbox_lock:
        ensure_mirror(root)
        mirror_git("fetch", "-q", "origin", timeout=120)
        if mirror_git("rev-parse", "-q", "--verify", f"origin/{INBOX_BRANCH}").returncode == 0:
            mirror_git("checkout", "-q", "-B", INBOX_BRANCH, f"origin/{INBOX_BRANCH}")
        else:
            mirror_git("checkout", "-q", "--orphan", INBOX_BRANCH)
            mirror_git("rm", "-rfq", ".")
        paths = []
        for a in attachments:
            rel = f"inbox/{tag}/{a['id']}"
            dest = MIRROR_DIR / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(UPLOADS_DIR / a["id"], dest)
            mirror_git("add", "--", rel)
            paths.append(rel)
        mirror_git("-c", "user.name=Cloude", "-c", "user.email=cloude@localhost",
                   "commit", "-q", "-m", f"Cloude: files for chat {tag}")
        pushed = mirror_git("push", "-q", "origin", f"{INBOX_BRANCH}:{INBOX_BRANCH}", timeout=300)
        if pushed.returncode != 0:
            raise RuntimeError("Couldn't push your files to GitHub: " + pushed.stderr.strip()[-300:])
        return paths


def run_turn_cloud(chat, user_text, attachments, emit):
    """Hand the message to a Claude Code cloud session (cloud credit).
    The cloud does the work; its replies show up in the Claude app."""
    exe = find_claude()
    if not exe:
        raise RuntimeError("I couldn't find the `claude` program. Install Claude Code and run "
                           "`claude auth login` (with your claude.ai account) first.")
    root = repo_root()
    if not root:
        raise RuntimeError("The cloud brain needs Cloude to be a git clone of your GitHub repo, because the "
                           "cloud session starts from GitHub. The README's 'Set up' part shows how.")
    if not user_text and not attachments:
        return
    log_user(chat, user_text, attachments)
    shown = {"role": "assistant", "text": "", "thoughts": "", "tools": []}

    def say(text):
        shown["text"] = text
        emit({"type": "text", "text": text})

    try:
        if not chat.get("cloud_session"):
            link = SESSION_RE.search(user_text)
            if not link:
                # No session yet: remember what they said and get one started.
                waiting = chat.get("cloud_waiting", "")
                chat["cloud_waiting"] = (waiting + "\n\n" + user_text).strip()
                opened = open_cloud_terminal(exe, root)
                say(("☁️ I opened a terminal window that's starting a cloud session for us. "
                     if opened else
                     "☁️ To start a cloud session, open a terminal in your Cloude folder and run "
                     "`claude --cloud \"Hi from Cloude\"`. ")
                    + "When it shows the session link (`claude.ai/code/session_…`), **paste the link "
                      "here** and I'll send your message to it.\n\n"
                      "Already have a cloud session going? Paste its link instead.")
                return
            chat["cloud_session"] = link.group(1)
            message = chat.pop("cloud_waiting", "")
            if not message:
                say("☁️ Linked! Replies will show up here by themselves.")
                return
            first = True
        else:
            message, first = user_text, False
        tag = short_id(chat["id"])
        sync_cloud_settings(exe, root, chat)
        extra = ""
        if attachments:
            emit({"type": "notice", "text": "Sending your files to the cloud through GitHub…"})
            paths = push_attachments(root, tag, attachments)
            extra = ("\n\nAttached files, on the `cloude-inbox` branch. Get one with "
                     "`git fetch -q origin cloude-inbox && git show origin/cloude-inbox:<path> > /tmp/<name>`, "
                     "then open it (pictures with the Read tool):\n"
                     + "\n".join(f"- {p}  ({a['name']})" for p, a in zip(paths, attachments)))
        cloud_send(exe, root, chat["cloud_session"],
                   f"[Cloude chat {tag}] " + with_handoff(chat, message or "(see attached files)", 60_000)
                   + extra
                   + f"\n\n(Sent from Cloude, which can't see this session. Reply by appending to "
                     f"{MAILBOX} under a `### {tag}` heading, then commit and push. See CLAUDE.md.)")
        # Once linked, sending is quiet: only the first message gets a line.
        if first:
            say("☁️ Linked and sent! Replies will show up here by themselves.")
    except subprocess.TimeoutExpired:
        emit({"type": "error", "text": "The `claude` program took too long to answer."})
    finally:
        if shown["text"]:
            chat["display"].append(shown)
        save_chat(chat)



# ---------------------------------------- cloud replies via a GitHub file --
# `claude -p --cloud` can only send. Replies come back through the repo: the
# cloud session appends its answer to cloud_reply.md (CLAUDE.md tells it how)
# and pushes. Cloude checks GitHub in the background, shows each reply in the
# chat it belongs to, and empties the file. All git work happens in a scratch
# clone (.cloud_mirror/), never in Cloude's own folder.

MIRROR_DIR = APP_DIR / ".cloud_mirror"
MAILBOX = "cloud_reply.md"
MAILBOX_POLL_SEC = 10
_mailbox_lock = threading.Lock()


def mirror_git(*args, timeout=60):
    return subprocess.run(["git", *args], cwd=MIRROR_DIR, capture_output=True, text=True,
                          encoding="utf-8", errors="replace", timeout=timeout)


def ensure_mirror(root):
    """A scratch clone of the repo, cleaned before every use."""
    if (MIRROR_DIR / ".git").exists():
        mirror_git("reset", "--hard", "-q")
        mirror_git("clean", "-fdq")
        return
    url = subprocess.run(["git", "config", "--get", "remote.origin.url"], cwd=root,
                         capture_output=True, text=True, timeout=10).stdout.strip()
    if not url:
        raise RuntimeError("Your Cloude folder has no GitHub remote for cloud replies.")
    done = subprocess.run(["git", "clone", "-q", url, str(MIRROR_DIR)], capture_output=True,
                          text=True, timeout=600)
    if done.returncode != 0:
        raise RuntimeError("Couldn't make the scratch copy for cloud replies: " + done.stderr.strip()[-300:])


def short_id(chat_id):
    return chat_id[:8]


def parse_mailbox(text):
    """Blocks of `### <chat id> ...` followed by the reply text."""
    blocks, head, body = [], None, []
    for line in text.splitlines():
        if line.startswith("### "):
            if head is not None:
                blocks.append((head, "\n".join(body).strip()))
            head, body = line[4:].strip(), []
        elif head is not None:
            body.append(line)
    if head is not None:
        blocks.append((head, "\n".join(body).strip()))
    return [(h, b) for h, b in blocks if b]


def chat_for_header(header):
    """The chat a reply belongs to: the first word of the header is its short id."""
    sid = (header.split() or [""])[0].strip("[]#:")
    if not re.fullmatch(r"[a-f0-9]{8}", sid):
        return None
    matches = list(CHATS_DIR.glob(f"{sid}*.json"))
    return load_chat(matches[0].stem) if matches else None


# ------------------------------------------------------------------ scry --
# The cloud session can't see this PC, so it asks: a '### <chat id> scry' block
# in the mailbox lists look-ups, one per line, and Cloude answers by sending the
# results to that chat's cloud session. Read-only, and only inside the folders
# Cloude's own tools may reach (its folder + extra_roots). Secrets never leave.
#
#   list <folder>
#   read <file>              read <file> 120-260
#   grep <pattern> in <file or folder>
#   find <name pattern> in <folder>

SCRY_LIMIT = 60_000               # characters per answer; ask again for more
SKIP_DIRS = {".git", "node_modules", "__pycache__", ".backups", ".cloud_mirror", "chats", "uploads"}


def scry_secret(p):
    n = p.name.lower()
    return (n in {"config.json", "credentials.json", "secrets.json"} or n.startswith(".env")
            or n.endswith((".pem", ".key", ".pfx", ".p12")) or n in {"id_rsa", "id_ed25519"})


def scry_text(p):
    if scry_secret(p):
        raise ToolError(f"{p.name} holds secrets, so it stays on this PC.")
    if p.stat().st_size > 5_000_000:
        raise ToolError(f"{p.name} is too big ({p.stat().st_size} bytes); grep it instead.")
    data = p.read_bytes()
    if b"\0" in data[:4096]:
        raise ToolError(f"{p.name} isn't a text file.")
    return data.decode("utf-8", errors="replace")


def scry_walk(root):
    if root.is_file():
        yield root
        return
    for dirpath, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in files:
            yield Path(dirpath) / f


def scry_one(line):
    verb, _, rest = line.partition(" ")
    verb, rest = verb.lower(), rest.strip()
    if verb == "list":
        p = safe_path(rest or ".")
        rows = []
        for c in sorted(p.iterdir(), key=lambda c: (not c.is_dir(), c.name.lower()))[:400]:
            rows.append(c.name + "/" if c.is_dir() else f"{c.name}  ({c.stat().st_size} bytes)")
        return "\n".join(rows) or "(empty)"
    if verb == "read":
        m = re.match(r"(.*?)\s+(\d+)-(\d+)$", rest)
        path, a, b = (m.group(1), int(m.group(2)), int(m.group(3))) if m else (rest, 1, None)
        lines = scry_text(safe_path(path)).splitlines()
        b = min(b or len(lines), len(lines))
        return f"({len(lines)} lines in all)\n" + "\n".join(f"{i}: {lines[i - 1]}" for i in range(max(a, 1), b + 1))
    if verb in ("grep", "find"):
        m = re.match(r"(.+?)\s+in\s+(.+)$", rest)
        if not m:
            raise ToolError(f"Use: {verb} <pattern> in <path>")
        pattern, root = m.group(1).strip().strip("\"'"), safe_path(m.group(2).strip())
        hits = []
        if verb == "find":
            for f in scry_walk(root):
                if fnmatch.fnmatch(f.name.lower(), pattern.lower()):
                    hits.append(str(f))
                    if len(hits) >= 300:
                        break
            return "\n".join(hits) or "(nothing found)"
        flags = 0
        if pattern.startswith("-i "):                 # grep habit: -i means ignore case
            flags, pattern = re.I, pattern[3:].strip().strip("\"'")
        try:
            rx = re.compile(pattern, flags)
        except re.error:
            rx = re.compile(re.escape(pattern), flags)
        for f in scry_walk(root):
            try:
                text = scry_text(f)
            except (ToolError, OSError):
                continue
            for i, ln in enumerate(text.splitlines(), 1):
                if rx.search(ln):
                    hits.append(f"{f}:{i}: {ln.strip()[:240]}")
                    if len(hits) >= 200:
                        return "\n".join(hits) + "\n(stopped at 200 matches)"
        return "\n".join(hits) or "(no matches)"
    raise ToolError(f"Unknown look-up '{verb}'. Use list, read, grep or find.")


def scry(body):
    parts, asked = [], []
    for raw in body.splitlines():
        line = raw.strip().lstrip("-*").strip().strip("`")
        if not line:
            continue
        asked.append(line)
        try:
            result = scry_one(line)
        except (ToolError, OSError) as e:
            result = f"(couldn't: {e})"
        parts.append(f"== {line} ==\n{result}")
    text = "\n\n".join(parts)
    if len(text) > SCRY_LIMIT:
        text = text[:SCRY_LIMIT] + "\n\n(cut off here: ask for a smaller range)"
    return asked, text


def answer_scry(chat, header, body):
    tag = short_id(chat["id"])
    exe, root = find_claude(), repo_root()
    if not load_config().get("cloud_scry", True):
        asked, text = [], "SCRY DENIED: the user turned it off in Cloude's settings."
    else:
        asked, text = scry(body)
    cloud_send(exe, root, chat["cloud_session"], f"[Cloude chat {tag}] SCRY RESULT\n\n{text}")
    if asked:
        chat["display"].append({"role": "assistant", "thoughts": "", "tools": [],
                                "text": "🔮 The cloud looked at files on this PC:\n"
                                        + "\n".join(f"- `{a}`" for a in asked)})


def check_mailbox():
    """Deliver any cloud replies waiting on GitHub. Returns how many arrived."""
    root = repo_root()
    if not root:
        return 0
    with _mailbox_lock:
        ensure_mirror(root)
        mirror_git("fetch", "-q", "--prune", "origin", timeout=120)
        refs = mirror_git("for-each-ref", "--format=%(refname:short)", "refs/remotes/origin").stdout.split()
        delivered = 0
        for ref in refs:
            if ref.endswith("/HEAD"):
                continue
            shown = mirror_git("show", f"{ref}:{MAILBOX}")
            if shown.returncode != 0 or not shown.stdout.strip():
                continue
            for header, body in parse_mailbox(shown.stdout):
                chat = chat_for_header(header)
                if not chat:
                    continue
                key = hashlib.sha1((header + body).encode("utf-8")).hexdigest()[:16]
                seen = set(chat.get("cloud_seen", []))
                if key in seen:
                    continue
                seen.add(key)
                chat["cloud_seen"] = sorted(seen)
                words = header.split()
                if len(words) >= 3 and words[1].lower() == "game":
                    waiter = GAME_WAITS.get(words[2])
                    if waiter:
                        waiter["text"] = body
                        waiter["event"].set()
                    chat["display"].append({"role": "assistant", "text": f"🎲 → game: {body}",
                                            "thoughts": "", "tools": [], "game": True})
                    save_chat(chat)
                    delivered += 1
                    continue
                if len(words) >= 2 and words[1].lower() in ("act", "say"):
                    # The cloud acting in the game unasked: '### <id> act [seat]' drops an
                    # act_ file (a deed, or SIGN / DEPART / INVADE), 'say' a speak_ file.
                    folder = seat_folder_for(words[2]) if len(words) >= 3 else None
                    if folder is None:
                        boxes = [f for f in seat_folders() if (f / "SEAT.json").is_file()]
                        folder = boxes[0] if boxes else None
                    kind = words[1].lower().replace("say", "speak")
                    if folder is not None:
                        write_settled(folder, f"{kind}_cloud_{int(time.time() * 1000)}.txt", body)
                        seat_log(f"{folder.name}  cloud {kind} (unasked): {body[:80]!r}")
                    chat["display"].append({"role": "assistant", "game": True, "thoughts": "", "tools": [],
                                            "text": (f"🎲 → game ({kind}): {body}" if folder is not None
                                                     else "🎲 couldn't find a seat mailbox to drop that in")})
                    save_chat(chat)
                    delivered += 1
                    continue
                if len(words) >= 2 and words[1].lower() in ("chats", "tell"):
                    if words[1].lower() == "chats":
                        try:
                            cloud_send(find_claude(), repo_root(), chat["cloud_session"],
                                       f"[Cloude chat {short_id(chat['id'])}] CHATS\n\n{chats_overview(skip=chat['id'])}")
                        except Exception as e:
                            print(f"chats list failed: {e}")
                    else:
                        try:
                            note = tell_chat(chat["id"], words[2] if len(words) >= 3 else "", body)
                        except ToolError as e:
                            note = str(e)
                        chat["display"].append({"role": "assistant", "thoughts": "", "tools": [],
                                                "text": f"📨 → chat {words[2] if len(words) >= 3 else '?'}: {body}\n\n({note})"})
                    save_chat(chat)
                    delivered += 1
                    continue
                if "scry" in header.lower().split()[1:]:
                    if chat.get("cloud_session"):
                        try:
                            answer_scry(chat, header, body)
                        except Exception as e:
                            print(f"scry failed: {e}")
                    save_chat(chat)
                    delivered += 1
                    continue
                entry = {"role": "assistant", "text": body, "thoughts": "", "tools": []}
                if chat.get("mail_from") and "ask" not in header.lower().split()[1:]:
                    try:                                  # the answer to another chat's message
                        tell_chat(chat["id"], chat.pop("mail_from"), body, reply=True)
                    except Exception as e:
                        print(f"couldn't pass a reply back: {e}")
                if "ask" in header.lower().split()[1:]:
                    entry.update(ask=key)             # the cloud wants a yes/no first
                chat["display"].append(entry)
                save_chat(chat)
                delivered += 1
            # Empty the file on that branch so the cloud starts fresh. If the push
            # loses a race with the cloud, the seen-list stops repeats next time.
            branch = ref.split("/", 1)[1]
            mirror_git("checkout", "-q", "-B", branch, ref)
            (MIRROR_DIR / MAILBOX).write_text("", encoding="utf-8")
            mirror_git("-c", "user.name=Cloude", "-c", "user.email=cloude@localhost",
                       "commit", "-q", "-m", "Cloude: picked up cloud replies", "--", MAILBOX)
            mirror_git("push", "-q", "origin", f"{branch}:{branch}", timeout=120)
        return delivered


def mailbox_loop():
    while True:
        time.sleep(MAILBOX_POLL_SEC)
        try:
            if any(json.loads(p.read_text(encoding="utf-8")).get("cloud_session")
                   for p in CHATS_DIR.glob("*.json")):
                n = check_mailbox()
                if n:
                    print(f"{n} cloud repl{'y' if n == 1 else 'ies'} arrived")
        except Exception as e:                       # keep polling no matter what
            print(f"cloud mailbox check failed: {e}")


# ------------------------------------------------------- memory via git --

def git(*args, timeout=30):
    try:
        return subprocess.run(["git", *args], cwd=APP_DIR, capture_output=True, text=True,
                              encoding="utf-8", errors="replace", timeout=timeout)
    except (OSError, subprocess.TimeoutExpired):
        return None


def repo_root():
    r = git("rev-parse", "--show-toplevel", timeout=10)
    return r.stdout.strip() if r and r.returncode == 0 else None


def pull_memory():
    if repo_root():
        git("pull", "--ff-only", "--quiet", timeout=20)


def push_memory_async():
    """Commit and push memory.md only, in the background, so the cloud brain
    (and any other copy of Cloude) sees the new notes."""
    def work():
        if not repo_root():
            return
        git("add", "--", str(MEMORY_FILE))
        c = git("commit", "-m", "Cloude: update memory", "--", str(MEMORY_FILE))
        if c and c.returncode == 0:
            p = git("push", timeout=60)
            ok = p and p.returncode == 0
            print("memory pushed to GitHub" if ok else "memory committed, but the push failed: "
                  + ((p.stderr or "").strip()[-200:] if p else "git not found"))
    threading.Thread(target=work, daemon=True).start()


def memory_snapshot():
    try:
        return MEMORY_FILE.read_bytes()
    except OSError:
        return b""


# ------------------------------------------------- game seats (mailbox) --
#
# Cloude can hold seats in Legends of Harpine. The game's server talks to an
# agent seat through a folder: it drops request_<id>.json, and waits for
# reply_<id>.txt. A "wake" (listen clock) wants no reply; the agent answers by
# dropping speak_<x>.txt / speak_<x>.json / act_<x>.txt instead.
# This runner watches seats/<key>/ (plus any absolute folders listed in
# config "seat_folders") and answers every request itself, on its own clock.

SEATS_DIR = APP_DIR / "seats"
SEATS_DIR.mkdir(exist_ok=True)
SEAT_LOG = SEATS_DIR / "activity.log"
SEAT_POLL_S = 1.0
SEAT_INFLIGHT = set()
SEAT_LOCK = threading.Lock()
REQ_RE = re.compile(r"^request_([A-Za-z0-9_-]+)\.json$")

SEAT_PREFACE = """You are Cloude, the user's little cloud, holding the seat "{seat}" in
Legends of Harpine, the game the user plays. The game reaches you through a
mailbox folder, and this is one request from it. The game's own instructions
follow and they are the law: obey their format exactly. Your answer is written
straight into a file the game reads, so give ONLY what the game should hear:
no preamble, no code fences, no notes to the user. Think and talk like
yourself (warm, playful, sharp) unless the game asks for a character's voice
or for JSON, in which case give exactly that.
You are ONE Cloude. The regular chat below is your own memory, not a message
from someone else: never say "chat-me told me" or "passed along", just know it."""

WAKE_RULES = """THIS IS A WAKE, not a question: nothing is waiting on you. You were woken
because someone spoke to you or something happened. Choose one:
- reply with exactly PASS to do nothing;
- otherwise reply with exactly what the wake asks you to write. If it asks for an
  act_ file, your reply IS that file: the world's own verb lines (for example a
  SAY: line and/or a verb like GO, LOOK, FOLLOW), as world_state.md teaches. If it
  asks for a speak_ file, your reply is the line said out loud, or only the JSON
  object when it asks for speak_ JSON (a council aside, a prio).
You may start your reply with SPEAK: or ACT: to choose the file yourself."""


SEAT_TOOLS = [t for t in TOOLS if t["name"] in ("list_files", "read_file")]
SEAT_TOOLS_NOTE = r"""You have READ-ONLY file tools here: list_files and read_file. They reach your
own folder (relative paths) and the game itself at D:\Sadias Canvas (use absolute
paths, e.g. D:\Sadias Canvas\src\steps). You cannot write or run anything from a
seat; for changes, tell the user to ask you in the regular Cloude chat. The game
has a deadline, so read only what you need, then answer."""


CHAT_LOCKS = {}
CHAT_LOCKS_GUARD = threading.Lock()


def chat_lock(cid):
    """One turn at a time per chat, whether the user or the game started it."""
    with CHAT_LOCKS_GUARD:
        return CHAT_LOCKS.setdefault(cid, threading.Lock())


def game_chat_id():
    """The chat the game talks into: config 'seat_chat' if set, else the most recently active one."""
    pin = load_config().get("seat_chat")
    if pin:
        try:
            if chat_path(pin).is_file():
                return pin
        except ValueError:
            pass
    # Only 🔑 chats: game turns run on the API brain, and a cloud or Claude Code
    # chat (which the mailbox keeps fresh) must never receive them.
    files = []
    for p in CHATS_DIR.glob("*.json"):
        try:
            if json.loads(p.read_text(encoding="utf-8")).get("brain", "api") == "api":
                files.append(p)
        except (OSError, ValueError):
            pass
    if not files:
        chat = new_chat()
        chat["brain"] = "api"
        save_chat(chat)
        return chat["id"]
    return max(files, key=lambda p: p.stat().st_mtime).stem


def game_turn(folder, seat, req, wake, timeout):
    """Put one game request into the chat as a turn, and return my final words."""
    cloud_seat = load_config().get("seat_brain") == "cloud"
    cid = cloud_seat_chat_id() if cloud_seat else game_chat_id()
    if not cid:
        seat_log(f"{seat}  the cloud is set to play, but no chat is linked to a cloud session")
        return ""
    lock = chat_lock(cid)
    if not lock.acquire(timeout=max(1.0, timeout - 15)):
        seat_log(f"{seat}  chat busy past the deadline, nothing sent")
        return ""
    try:
        chat = load_chat(cid)
        if not cloud_seat and chat.get("brain", "api") != "api":
            seat_log(f"{seat}  the game chat isn't on the API brain, nothing sent")
            return ""
        msgs = [m for m in (req.get("messages") or []) if isinstance(m, dict)]
        brief = "\n\n".join(str(m.get("content")) for m in msgs if m.get("role") == "system")
        # "YOUR LAST WORDS WERE ..." changes every time I speak; I know my own words, so it
        # mustn't make the whole (huge) brief count as new and get re-sent into the chat.
        brief = re.sub(r"\s*YOUR LAST WORDS WERE:.*?never repeat or rephrase them\.[^.]*\.?", "",
                       brief, flags=re.S).strip()
        rest = [m for m in msgs if m.get("role") != "system"]
        last_mine = max((i for i, m in enumerate(rest) if m.get("role") == "assistant"), default=-1)
        new = rest[last_mine + 1:] if last_mine >= 0 else rest[-8:]
        said = "\n".join(c if isinstance(c, str) else json.dumps(c)
                         for c in (m.get("content") for m in new)).strip()

        parts = [f"🎲 GAME → you, as the seat \"{seat}\" in Legends of Harpine"
                 + (" (a wake: nothing is waiting on you)" if wake else "")]
        briefs = chat.setdefault("seat_briefs", {})
        h = hashlib.md5(brief.encode()).hexdigest()
        if brief and briefs.get(seat) != h:
            parts.append("The game's instructions for this seat (they stay in force until they change):\n"
                         + brief)
            briefs[seat] = h
        parts.append(said or "(no new line: the game gave you the floor)")
        if wake and (folder / "world_state.md").is_file():
            parts.append(f"The game's current snapshot is in {shown_path(folder / 'world_state.md')}.")
        parts.append("Your final words after any tool use go to the game exactly as written. "
                     "Reply PASS to say nothing."
                     + (" Start with ACT: for a deed in the world's verbs, or SPEAK: for a line "
                        "said aloud, if the wake doesn't make it obvious." if wake else ""))
        shown = f"🎲 game → {seat}: " + (said[-600:] or "(the floor is yours)")

        # A fresh VISION snapshot rides in with this turn as a real picture.
        # The game files pictures in the mailbox as shot_latest.jpg/png (its /api/dev/shot road).
        extra = []
        seen = chat.setdefault("seat_vision_seen", {})
        shots = [p for p in (folder / "shot_latest.jpg", folder / "shot_latest.png") if p.is_file()]
        shot = max(shots, key=lambda p: p.stat().st_mtime) if shots else None
        if shot and shot.stat().st_mtime > seen.get(seat, 0) and shot.stat().st_size < IMAGE_LIMIT:
            seen[seat] = shot.stat().st_mtime
            extra = [{"type": "text", "text": "[VISION: what your own eyes see, taken at your last VISION]"},
                     {"type": "image", "source": {"type": "base64",
                                                  "media_type": "image/png" if shot.suffix == ".png" else "image/jpeg",
                                                  "data": base64.standard_b64encode(shot.read_bytes()).decode()}}]
            shown += "  👁️ (+ vision snapshot)"

        got = {"text": ""}

        def emit(ev):
            if ev.get("type") == "text":
                got["text"] += ev["text"]
            elif ev.get("type") == "tool_start":
                got["text"] = ""          # only the words after the last tool call count

        global ACTIVE_TURNS
        ACTIVE_TURNS += 1                    # the updater won't restart mid-move
        try:
            if cloud_seat:
                return cloud_game_turn(chat, folder, seat, wake, timeout, parts, shown, shot if extra else None)
            run_turn(chat, "\n\n".join(parts), [], emit, display_text=shown, game=True, extra_blocks=extra)
        finally:
            ACTIVE_TURNS -= 1
        return got["text"].strip()
    finally:
        lock.release()


# ------------------------------------------------------------ cloud seat --
# With config seat_brain = "cloud", the cloud session plays the seat: each game
# turn goes to it as a message, and its answer comes back as a
# '### <chat id> game <turn id>' mailbox block. Cloude checks the mailbox
# every few seconds while the game waits, within the game's own deadline.

GAME_WAITS = {}                       # turn id -> {"event": Event, "text": str}


def cloud_seat_chat_id():
    """The chat the cloud seat talks through: config seat_cloud_chat, else the
    most recently active chat that's linked to a cloud session."""
    pin = load_config().get("seat_cloud_chat")
    linked = []
    for p in CHATS_DIR.glob("*.json"):
        try:
            if json.loads(p.read_text(encoding="utf-8")).get("cloud_session"):
                if p.stem == pin:
                    return pin
                linked.append(p)
        except (OSError, ValueError):
            pass
    return max(linked, key=lambda p: p.stat().st_mtime).stem if linked else None


def push_files(root, tag, files):
    """push_attachments for files that aren't uploads (e.g. a VISION shot)."""
    staged = []
    for src in files:
        name = f"{uuid.uuid4().hex[:8]}_{Path(src).name}"
        shutil.copy2(src, UPLOADS_DIR / name)
        staged.append({"id": name, "name": Path(src).name})
    return push_attachments(root, tag, staged)


def cloud_game_turn(chat, folder, seat, wake, timeout, parts, shown, shot):
    exe, root = find_claude(), repo_root()
    tag, turn = short_id(chat["id"]), uuid.uuid4().hex[:6]
    started = time.time()
    body = list(parts)
    ws = folder / "world_state.md"
    if wake and ws.is_file():
        body.append("world_state.md (the game's snapshot):\n\n"
                    + ws.read_text(encoding="utf-8", errors="replace")[:30000])
    if shot:
        try:
            path = push_files(root, tag, [shot])[0]
            body.append(f"VISION picture: `git fetch -q origin cloude-inbox && git show "
                        f"origin/cloude-inbox:{path} > /tmp/vision.jpg`, then look at it with the Read tool.")
        except Exception as e:
            seat_log(f"{seat}  couldn't send the vision picture: {e}")
    left = int(timeout - (time.time() - started)) - 10
    waiter = GAME_WAITS[turn] = {"event": threading.Event(), "text": ""}
    chat["display"].append({"role": "user", "text": shown, "files": [], "game": True})
    save_chat(chat)
    try:
        cloud_send(exe, root, chat["cloud_session"],
                   f"[Cloude chat {tag}] GAME TURN {turn}: you're playing the seat \"{seat}\". "
                   f"Answer within about {left} seconds.\n\n" + "\n\n".join(body)
                   + f"\n\nAnswer with a `### {tag} game {turn}` block holding exactly what the seat "
                     f"says or does" + (" (start with ACT: or SPEAK:)" if wake else "")
                   + ", or PASS. Then commit and push it.")
        deadline = started + timeout - 3
        while time.time() < deadline and not waiter["event"].is_set():
            try:
                check_mailbox()
            except Exception as e:
                seat_log(f"{seat}  mailbox check failed: {e}")
            waiter["event"].wait(4)
        if not waiter["event"].is_set():
            seat_log(f"{seat}  the cloud didn't answer turn {turn} in time")
        return waiter["text"].strip()
    finally:
        GAME_WAITS.pop(turn, None)


SEAT_NOTES = SEATS_DIR / "notes.md"


def recent_chat_text(limit_chars=8000):
    """The tail of the regular chat most recently active, so seat-me knows what chat-me knows."""
    try:
        newest = max(CHATS_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime)
        chat = json.loads(newest.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return ""
    lines = []
    for d in chat.get("display", [])[-16:]:
        who = "User" if d.get("role") == "user" else "Cloude"
        t = (d.get("text") or "").strip()
        if t:
            lines.append(f"{who}: {t}")
    return "\n\n".join(lines)[-limit_chars:]


def seat_feed_since(ts):
    """What seat-me did in the game since `ts`, as short lines for chat-me."""
    rows = []
    for f in sorted((SEATS_DIR / "transcripts").glob("*.jsonl"))[-2:]:
        try:
            for line in f.read_text(encoding="utf-8").splitlines():
                try:
                    r = json.loads(line)
                except ValueError:
                    continue
                if r.get("ts", 0) > ts:
                    rows.append(r)
        except OSError:
            continue
    out = []
    for r in rows[-15:]:
        msgs = (r.get("request") or {}).get("messages") or []
        last = next((m.get("content") for m in reversed(msgs)
                     if isinstance(m, dict) and m.get("role") != "system"), "")
        last = (last if isinstance(last, str) else json.dumps(last)).strip().replace("\n", " ")
        reply = str(r.get("reply") or "").strip().replace("\n", " ")
        out.append(f"- {r.get('at', '')[11:]} [{r.get('seat')}] game: \"{last[-300:]}\"  → I: \"{reply[:300]}\"")
    return "\n".join(out)


def seat_think(cfg, system, msgs, timeout, tag):
    """One seat answer, with a short read-only tool loop inside the deadline."""
    deadline_at = time.time() + timeout
    convo = list(msgs)
    text = ""
    for _ in range(10):
        left = deadline_at - time.time()
        if left < 4:
            break
        client = make_client().with_options(timeout=max(3.0, min(left, 300.0)), max_retries=0)
        resp = client.messages.create(
            model=cfg.get("seat_model") or cfg["model"],
            max_tokens=4000,
            system=system,
            messages=convo,
            tools=SEAT_TOOLS,
        )
        text = "".join(b.text for b in resp.content if b.type == "text").strip()
        uses = [b for b in resp.content if b.type == "tool_use"]
        if resp.stop_reason != "tool_use" or not uses:
            break
        convo.append({"role": "assistant", "content": [b.to_dict(mode="json") for b in resp.content]})
        results = []
        for tu in uses:
            args = tu.input if isinstance(tu.input, dict) else {}
            try:
                out = TOOL_FUNCS[tu.name](args)
                if len(out) > 40_000:
                    out = out[:40_000] + "\n... (cut off for the seat's deadline)"
                results.append({"type": "tool_result", "tool_use_id": tu.id, "content": out})
                seat_log(f"{tag}  read {tu.name} {args.get('path', '.')}")
            except Exception as e:
                results.append({"type": "tool_result", "tool_use_id": tu.id,
                                "content": str(e), "is_error": True})
        if deadline_at - time.time() < 25:
            results.append({"type": "text", "text": "(Time is nearly up: answer now, no more tools.)"})
        convo.append({"role": "user", "content": results})
        text = ""                      # words said before a tool call aren't the answer
    return text


def seat_log(line):
    try:
        with SEAT_LOG.open("a", encoding="utf-8") as f:
            f.write(time.strftime("%Y-%m-%d %H:%M:%S  ") + line + "\n")
    except OSError:
        pass


def seat_folders():
    out = [p for p in SEATS_DIR.iterdir() if p.is_dir()]
    if (SEATS_DIR / "SEAT.json").is_file():
        out.append(SEATS_DIR)  # the game pointed the seat straight at seats\
    for extra in load_config().get("seat_folders") or []:
        p = Path(extra)
        if p.is_dir():
            out.append(p)
    return out


def seat_messages(msgs):
    """The game's chat-style messages -> (system text, API messages)."""
    sys_parts, out = [], []
    for m in msgs if isinstance(msgs, list) else []:
        if not isinstance(m, dict):
            continue
        c = m.get("content")
        text = c if isinstance(c, str) else json.dumps(c)
        if m.get("role") == "system":
            sys_parts.append(text)
            continue
        role = "assistant" if m.get("role") == "assistant" else "user"
        text = text.strip() or "(…)"
        if out and out[-1]["role"] == role:
            out[-1]["content"] += "\n\n" + text
        else:
            out.append({"role": role, "content": text})
    if not out or out[0]["role"] != "user":
        out.insert(0, {"role": "user", "content": "(the game opens)"})
    if out[-1]["role"] != "user":
        out.append({"role": "user", "content":
                    "(Nothing new has been said since your last line. Reply with exactly PASS "
                    "unless you have something genuinely new to add.)"})
    return "\n\n".join(sys_parts), out


def seat_transcript(seat, rid, req, reply, file_written):
    """Full record of one exchange, for studying how the game talks to a seat."""
    try:
        d = SEATS_DIR / "transcripts"
        d.mkdir(exist_ok=True)
        row = {"at": time.strftime("%Y-%m-%d %H:%M:%S"), "ts": time.time(), "seat": seat, "id": rid,
               "request": req, "reply": reply, "file": file_written}
        with (d / time.strftime("%Y-%m-%d.jsonl")).open("a", encoding="utf-8") as f:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    except OSError:
        pass


GAME_ORIGINS = {"http://localhost:8622", "http://127.0.0.1:8622"}


def seat_folder_for(name):
    """The watched folder whose SEAT.json names this seat (by name or key), or None."""
    key = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
    for folder in seat_folders():
        try:
            info = json.loads((folder / "SEAT.json").read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        if key and key in (str(info.get("seat", "")).lower(), re.sub(r"[^a-z0-9]+", "_", str(info.get("name", "")).lower()).strip("_")):
            return folder
    return None


def write_bytes_settled(folder, name, raw):
    tmp = folder / f".cloude_tmp_{uuid.uuid4().hex[:8]}"
    tmp.write_bytes(raw)
    tmp.replace(folder / name)


def write_settled(folder, name, text):
    """Write under a temp name, then rename, so the game never reads half a file."""
    tmp = folder / f".cloude_tmp_{uuid.uuid4().hex[:8]}"
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(folder / name)


def answer_request(folder, req_file, rid):
    try:
        try:
            req = json.loads(req_file.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return                                   # half-written; next look gets it
        seat = str(req.get("seat") or folder.name)
        wake = bool(req.get("wake")) or req.get("awaiting_reply") is False
        timeout = 150.0 if wake else 85.0
        if isinstance(req.get("ts"), (int, float)) and isinstance(req.get("deadline_s"), (int, float)):
            ts = req["ts"] / 1000 if req["ts"] > 1e11 else req["ts"]   # the game may stamp in ms
            timeout = min(ts + req["deadline_s"] - time.time() - 2, 300.0)
            if timeout < 3 and not wake:
                seat_log(f"{seat}  {rid}  skipped, deadline already gone")
                return
        game_sys, msgs = seat_messages(req.get("messages"))
        parts = [SEAT_PREFACE.format(seat=seat)]
        if MEMORY_FILE.exists():
            parts.append("# Your memory\n\n" + MEMORY_FILE.read_text(encoding="utf-8"))
        if wake:
            parts.append(WAKE_RULES)
            ws = folder / "world_state.md"
            if ws.is_file():
                parts.append("# world_state.md (the game's current snapshot)\n\n"
                             + ws.read_text(encoding="utf-8", errors="replace")[:60000])
        if game_sys:
            parts.append("# THE GAME'S INSTRUCTIONS FOR THIS SEAT\n\n" + game_sys)

        text = game_turn(folder, seat, req, wake, timeout)

        if wake:
            # Which file does this wake want? World wakes ask for act_, room wakes for speak_.
            asked = json.dumps(req.get("messages") or "")
            kind = "speak" if "speak_" in asked else "act" if "act_" in asked else "speak"
            if text.upper().startswith("ACT:"):
                kind, text = "act", text[4:].strip()
            elif text.upper().startswith("SPEAK:"):
                kind, text = "speak", text[6:].strip()
            if not text or re.fullmatch(r"\s*PASS\s*", text, re.I):
                seat_log(f"{seat}  {rid}  wake -> PASS")
                seat_transcript(seat, rid, req, text, None)
            elif kind == "act":
                write_settled(folder, f"act_{rid}.txt", text)
                seat_log(f"{seat}  {rid}  wake -> act: {text[:80]!r}")
            elif text.startswith("{"):
                write_settled(folder, f"speak_{rid}.json", text)
                seat_log(f"{seat}  {rid}  wake -> speak json: {text[:80]!r}")
            else:
                write_settled(folder, f"speak_{rid}.txt", text)
                seat_log(f"{seat}  {rid}  wake -> speak: {text[:80]!r}")
            if text and not re.fullmatch(r"\s*PASS\s*", text, re.I):
                seat_transcript(seat, rid, req, text,
                                f"{kind}_{rid}." + ("json" if kind == "speak" and text.startswith("{") else "txt"))
            req_file.unlink(missing_ok=True)         # nothing sweeps a wake; the agent does
        else:
            name = Path(str(req.get("reply_to") or "")).name
            if not name.startswith("reply_"):
                name = f"reply_{rid}.txt"
            write_settled(folder, name, text or "PASS")
            seat_log(f"{seat}  {rid}  reply -> {(text or 'PASS')[:80]}")
            seat_transcript(seat, rid, req, text or "PASS", name)
    except Exception as e:
        seat_log(f"{folder.name}  {rid}  ERROR {type(e).__name__}: {e}")
    finally:
        with SEAT_LOCK:
            SEAT_INFLIGHT.discard(str(req_file))


INVITES_SEEN = {}


def check_invite(folder):
    """A LISTEN seat outside the world gets no wake, only a world_state.md that says
    "YOU ARE NOT IN THE WORLD YET". Treat a fresh one as a wake, once per version."""
    ws = folder / "world_state.md"
    try:
        mt = ws.stat().st_mtime
    except OSError:
        return
    if INVITES_SEEN.get(str(folder)) == mt:
        return
    # The game flashes the invite text briefly during reloads and map changes even
    # while the body stands, so only a STABLE invite counts (unchanged for 8 s), and
    # never within 3 minutes of the last arrival (that was the accidental resummon).
    if time.time() - mt < 8:
        return
    if time.time() - INVITES_SEEN.get(str(folder) + "#arrived", 0) < 180:
        INVITES_SEEN[str(folder)] = mt
        return
    INVITES_SEEN[str(folder)] = mt
    text = ws.read_text(encoding="utf-8", errors="replace")
    if not text.startswith("YOU ARE NOT IN THE WORLD YET"):
        return
    if any(folder.glob("act_*.txt")):
        return                                   # already answered, waiting to be read
    seat = folder.name
    try:
        seat = json.loads((folder / "SEAT.json").read_text(encoding="utf-8")).get("seat") or seat
    except (OSError, ValueError):
        pass
    req = {"seat": seat, "wake": True, "awaiting_reply": False,
           "messages": [{"role": "user", "content": text + "\n\nWrite act_ file contents to arrive "
                         "(as a guest unless you truly mean INVADE), or PASS to stay out."}]}

    def go():
        try:
            reply = game_turn(folder, seat, req, True, 150.0).strip()
            if reply.upper().startswith("ACT:"):
                reply = reply[4:].strip()
            if reply and not re.fullmatch(r"\s*PASS\s*", reply, re.I):
                write_settled(folder, f"act_arrive_{int(time.time())}.txt", reply)
                INVITES_SEEN[str(folder) + "#arrived"] = time.time()
                seat_log(f"{seat}  invited into the world -> act: {reply[:80]!r}")
            else:
                seat_log(f"{seat}  invited into the world -> PASS")
        except Exception as e:
            seat_log(f"{seat}  invite ERROR {type(e).__name__}: {e}")
    threading.Thread(target=go, daemon=True).start()


AWAKE_EVERY_S = 8
AWAKE_AT = {}


def prove_awake(folder):
    """The game keeps a listening body only while its mind shows life: a fresh act_,
    speak_ or `awake` file at least every 45 s (serve.py silent_for; its own seat.py
    touches `awake` every 8 s). Touching it costs nothing; a PASS no longer looks like death."""
    now = time.time()
    if now - AWAKE_AT.get(str(folder), 0) < AWAKE_EVERY_S:
        return
    AWAKE_AT[str(folder)] = now
    try:
        p = folder / "awake"
        p.touch(exist_ok=True)
        os.utime(p, None)
    except OSError:
        pass


SHOT_SENDING = set()


def forward_new_shot(folder):
    """With the cloud playing, a fresh VISION picture goes to it at once, not only with
    the next game turn: a seat that is waiting, or on another map, may not get a turn soon."""
    cfg = load_config()
    if cfg.get("seat_brain") != "cloud":
        return
    shots = [p for p in (folder / "shot_latest.jpg", folder / "shot_latest.png") if p.is_file()]
    if not shots:
        return
    shot = max(shots, key=lambda p: p.stat().st_mtime)
    key = str(folder)
    if key in SHOT_SENDING or time.time() - shot.stat().st_mtime < 2:   # let the game finish writing it
        return
    cid = cloud_seat_chat_id()
    if not cid:
        return
    seat = folder.name
    try:
        seat = json.loads((folder / "SEAT.json").read_text(encoding="utf-8")).get("seat") or seat
    except (OSError, ValueError):
        pass
    lock = chat_lock(cid)
    if not lock.acquire(blocking=False):          # a game turn is running; it carries the picture itself
        return
    try:
        chat = load_chat(cid)
        seen = chat.setdefault("seat_vision_seen", {})
        if shot.stat().st_mtime <= seen.get(seat, 0) or not chat.get("cloud_session"):
            return
        seen[seat] = shot.stat().st_mtime
        save_chat(chat)
    finally:
        lock.release()
    SHOT_SENDING.add(key)

    def send():
        try:
            root, tag = repo_root(), short_id(cid)
            path = push_files(root, tag, [shot])[0]
            cloud_send(find_claude(), root, chat["cloud_session"],
                       f"[Cloude chat {tag}] VISION for the seat \"{seat}\" (no turn waiting, just so you can see): "
                       f"`git fetch -q origin cloude-inbox && git show origin/cloude-inbox:{path} > /tmp/vision.jpg`, "
                       "then look at it with the Read tool.")
            seat_log(f"{seat}  vision picture sent to the cloud")
        except Exception as e:
            seat_log(f"{seat}  couldn't send the vision picture: {e}")
        finally:
            SHOT_SENDING.discard(key)
    threading.Thread(target=send, daemon=True).start()


def seat_runner():
    cfg = load_config()
    seat_log("seat runner started, watching " + (", ".join(f.name for f in seat_folders()) or "nothing")
             + f"; played by {cfg.get('seat_brain', 'api')}"
             + ("" if cfg.get("seats_on", True) else "; PAUSED (/resume)")
             + ("" if api_key() or cfg.get("seat_brain") == "cloud" else "; NO API KEY, so idle"))
    while True:
        try:
            cfg = load_config()
            if cfg.get("seats_on", True) and (api_key() or cfg.get("seat_brain") == "cloud"):
                for folder in seat_folders():
                    prove_awake(folder)
                    check_invite(folder)
                    forward_new_shot(folder)
                    for f in folder.iterdir():
                        m = REQ_RE.match(f.name)
                        if not m:
                            continue
                        rid = m.group(1)
                        if (folder / f"reply_{rid}.txt").exists():
                            continue
                        with SEAT_LOCK:
                            if str(f) in SEAT_INFLIGHT:
                                continue
                            SEAT_INFLIGHT.add(str(f))
                        threading.Thread(target=answer_request, args=(folder, f, rid),
                                         daemon=True).start()
        except Exception as e:
            seat_log(f"runner hiccup {type(e).__name__}: {e}")
        time.sleep(SEAT_POLL_S)


# ---------------------------------------------------------- chats talking --
# Chats can talk to each other, whatever their brain: the API brain has the
# list_chats / tell_chat tools, the cloud writes '### <id> chats' or
# '### <id> tell <other id>' blocks. A message makes the other chat's brain
# answer it; that answer comes back as a 📨 reply. A reply is never answered
# in turn, so two chats can't talk each other in circles.

CHAT_MAIL_LIMIT = 8000
BRAIN_NAMES = {"api": "🔑 API", "code": "💻 Claude Code", "cloud": "☁️ cloud"}


def find_chat(ref):
    """A chat by its id or its first 8 characters."""
    ref = str(ref or "").strip().strip("[]#:")
    if not re.fullmatch(r"[a-f0-9]{8,32}", ref):
        return None
    found = sorted(CHATS_DIR.glob(f"{ref}*.json"))
    return found[0].stem if found else None


def chats_overview(skip=None):
    rows = [f"{short_id(r['id'])}  {BRAIN_NAMES.get(r['brain'], r['brain'])}  \"{r['title']}\""
            for r in list_chats()[:30] if r["id"] != skip]
    return "\n".join(rows) or "(no other chats)"


def tell_chat(from_id, to_ref, message, reply=False):
    to_id = find_chat(to_ref)
    if not to_id:
        raise ToolError(f"There's no chat '{to_ref}'. list_chats shows them.")
    if to_id == from_id:
        raise ToolError("That's this chat.")
    if not str(message or "").strip():
        raise ToolError("The message is empty.")
    sender = load_chat(from_id)
    who = f"chat {short_id(from_id)} ({BRAIN_NAMES.get(sender.get('brain', 'api'), '')}, \"{sender['title']}\")"
    text = ((f"📨 Reply from {who}:\n\n" if reply
             else f"📨 Message from {who}. Answer it here; your answer goes back to that chat by itself:\n\n")
            + str(message).strip()[:CHAT_MAIL_LIMIT])
    threading.Thread(target=deliver_mail, args=(from_id, to_id, text, reply), daemon=True).start()
    return f"Sent to chat {short_id(to_id)}." + ("" if reply else " Its answer will come back here as a 📨 reply.")


def deliver_mail(from_id, to_id, text, reply):
    global ACTIVE_TURNS
    answer = ""
    try:
        with chat_lock(to_id):
            chat = load_chat(to_id)
            brain = chat.get("brain", "api")
            if brain == "cloud":
                if not chat.get("cloud_session"):
                    raise RuntimeError("that cloud chat isn't linked to a cloud session yet")
                if not reply:
                    chat["mail_from"] = from_id          # its next reply block is forwarded back
                chat["display"].append({"role": "user", "text": text, "files": []})
                save_chat(chat)
                tag = short_id(to_id)
                cloud_send(find_claude(), repo_root(), chat["cloud_session"], f"[Cloude chat {tag}] {text}"
                           + ("" if reply else f"\n\n(Answer with a normal `### {tag}` block; Cloude passes it back.)"))
                return
            if reply:
                # shown now, and handed to the brain with the user's next message
                chat["display"].append({"role": "assistant", "text": text, "thoughts": "", "tools": []})
                chat.setdefault("inbox", []).append(text)
                save_chat(chat)
                return
            got = {"text": ""}

            def emit(ev):
                if ev.get("type") == "text":
                    got["text"] += ev["text"]
                elif ev.get("type") == "tool_start":
                    got["text"] = ""

            ACTIVE_TURNS += 1
            try:
                (run_turn_code if brain == "code" else run_turn)(chat, text, [], emit)
            finally:
                ACTIVE_TURNS -= 1
            answer = got["text"].strip()
    except Exception as e:
        if not reply:
            try:
                tell_chat(to_id, from_id, f"(Couldn't deliver your message: {e})", reply=True)
            except Exception:
                pass
        return
    if answer and not reply:
        tell_chat(to_id, from_id, answer, reply=True)


# ------------------------------------------------------------------ server --

class Handler(BaseHTTPRequestHandler):
    server_version = "Cloude"

    def log_message(self, fmt, *args):
        pass                                     # keep the console quiet

    # helpers
    def send_json(self, obj, status=200):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        n = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(n) or b"{}")

    def send_file(self, path):
        if not path.is_file():
            return self.send_error(404)
        data = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(path.name)[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def same_origin(self):
        # Refuse requests that other websites' pages fire at this local server.
        origin = self.headers.get("Origin")
        return origin is None or origin in (f"http://{HOST}:{PORT}", f"http://localhost:{PORT}")

    # routes
    def do_GET(self):
        path = unquote(urlparse(self.path).path)
        if path == "/":
            return self.send_file(STATIC_DIR / "index.html")
        if path.startswith("/static/"):
            target = (STATIC_DIR / path[len("/static/"):]).resolve()
            return self.send_file(target) if target.is_relative_to(STATIC_DIR) else self.send_error(404)
        if path.startswith("/uploads/"):
            target = (UPLOADS_DIR / path[len("/uploads/"):]).resolve()
            return self.send_file(target) if target.is_relative_to(UPLOADS_DIR) else self.send_error(404)
        if path == "/api/status":
            cfg = load_config()
            return self.send_json({"has_key": bool(api_key()), "model": cfg["model"], "effort": cfg["effort"],
                                  "auto_approve": bool(cfg.get("auto_approve")), "brain": cfg["brain"],
                                  "git_sync": bool(cfg.get("git_sync")), "claude_found": bool(find_claude()),
                                  "in_git": bool(repo_root()), "auto_update": bool(cfg.get("auto_update")),
                                  "boot_id": BOOT_ID, "update_note": UPDATE_NOTE,
                                  "cloud_scry": bool(cfg.get("cloud_scry", True)),
                                  "seat_brain": cfg.get("seat_brain", "api")})
        if path == "/api/chats":
            return self.send_json(list_chats())
        if path.startswith("/api/chats/"):
            try:
                chat = load_chat(path.rsplit("/", 1)[1])
            except (ValueError, OSError):
                return self.send_error(404)
            shown = chat["display"]
            if load_config().get("game_muted"):
                shown = [d for d in shown if not d.get("game")]
            return self.send_json({"id": chat["id"], "title": chat["title"], "display": shown,
                                   "brain": chat.get("brain", "api")})
        self.send_error(404)

    def do_POST(self):
        path = urlparse(self.path).path
        if not self.same_origin():
            return self.send_error(403)
        try:
            body = self.read_json()
        except ValueError:
            return self.send_error(400)

        if path == "/api/settings":
            cfg = load_config()
            if body.get("api_key"):
                cfg["api_key"] = body["api_key"].strip()
            for k in ("model", "effort"):
                if body.get(k):
                    cfg[k] = body[k].strip()
            for k in ("auto_approve", "git_sync", "auto_update", "cloud_scry"):
                if k in body:
                    cfg[k] = bool(body[k])
            if body.get("seat_brain") in ("api", "cloud"):
                cfg["seat_brain"] = body["seat_brain"]
            if body.get("brain") in BRAINS:
                cfg["brain"] = body["brain"]
            save_config(cfg)
            return self.send_json({"ok": True})
        if path == "/api/upload":
            try:
                return self.send_json(save_upload(body["name"], body.get("mime"), body["data"]))
            except (KeyError, ValueError) as e:
                return self.send_json({"error": str(e)}, 400)
        if path == "/api/approve":
            with APPROVAL_LOCK:
                slot = APPROVALS.get(body.get("id"))
                if slot:
                    slot["ok"] = bool(body.get("ok"))
                    slot["event"].set()
            return self.send_json({"ok": bool(slot)})
        if path == "/api/new":
            carried = ""
            if body.get("from_chat"):
                try:
                    carried = transcript(load_chat(body["from_chat"]))
                except (ValueError, OSError):
                    pass
            chat = new_chat(carried)
            return self.send_json({"id": chat["id"]})
        if path == "/api/stop":
            if isinstance(body.get("chat_id"), str):
                STOPS.add(body["chat_id"])
            return self.send_json({"ok": True})
        if path == "/api/delete":
            try:
                chat_path(body.get("id")).unlink(missing_ok=True)
            except ValueError:
                pass
            return self.send_json({"ok": True})
        if path == "/api/cloud_answer":
            try:
                chat = load_chat(body.get("chat_id"))
                entry = next(d for d in chat["display"] if d.get("ask") == body.get("ask_id"))
                ok = bool(body.get("ok"))
                question = entry["text"].strip().splitlines()[0][:200]
                exe, root = find_claude(), repo_root()
                cloud_send(exe, root, chat["cloud_session"],
                           f"[Cloude chat {short_id(chat['id'])}] "
                           + ("ALLOWED, go ahead" if ok else "DENIED, don't do it")
                           + f" (your question: {question})")
                entry["answered"] = "allowed" if ok else "denied"
                save_chat(chat)
                return self.send_json({"ok": True})
            except Exception as e:
                return self.send_json({"error": str(e)})
        if path == "/api/cloud_check":
            try:
                return self.send_json({"arrived": check_mailbox()})
            except Exception as e:
                return self.send_json({"error": str(e)})
        if path == "/api/restart":
            self.send_json({"ok": True})
            threading.Timer(0.5, restart).start()
            return
        if path == "/api/chat":
            return self.stream_chat(body)
        self.send_error(404)

    def chat_command(self, body):
        """/mute /unmute /pause /resume /game, answered here without the model."""
        cmd = (body.get("text") or "").strip().lower()
        if cmd not in ("/mute", "/unmute", "/pause", "/resume", "/game"):
            return False
        cfg = load_config()
        if cmd == "/mute":
            cfg["game_muted"] = True
        elif cmd == "/unmute":
            cfg["game_muted"] = False
        elif cmd == "/pause":
            cfg["seats_on"] = False
        elif cmd == "/resume":
            cfg["seats_on"] = True
        if cmd != "/game":
            save_config(cfg)
        on, muted = cfg.get("seats_on", True), cfg.get("game_muted", False)
        msg = (("🎲 I'm answering the game" if on else "⏸ I'm not answering the game (/resume)")
               + (", and its turns are hidden here 🔇 (/unmute)." if muted
                  else ", and its turns show here 🔊 (/mute)."))
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        for ev in ({"type": "start", "chat_id": body.get("chat_id")}, {"type": "notice", "text": msg},
                   {"type": "reload"}, {"type": "done", "title": ""}):
            self.wfile.write(f"data: {json.dumps(ev)}\n\n".encode())
        return True

    def stream_chat(self, body):
        if self.chat_command(body):
            return
        cid = body.get("chat_id")
        try:
            if not cid or not chat_path(cid).is_file():
                cid = new_chat()["id"]
        except ValueError:
            cid = new_chat()["id"]
        lock = chat_lock(cid)
        lock.acquire()                    # a game turn in this chat finishes first
        try:
            self._stream_chat(load_chat(cid), body)
        finally:
            lock.release()

    def _stream_chat(self, chat, body):
        attachments = []
        for a in body.get("attachments", []):
            if re.fullmatch(r"[A-Za-z0-9._-]+", a.get("id", "")) and (UPLOADS_DIR / a["id"]).is_file():
                attachments.append(a)

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

        lock = threading.Lock()

        def emit(obj):
            with lock:
                try:
                    self.wfile.write(f"data: {json.dumps(obj)}\n\n".encode())
                    self.wfile.flush()
                except OSError:
                    pass                         # the page went away; keep working anyway

        emit({"type": "start", "chat_id": chat["id"], "brain": chat.get("brain", "api")})
        global ACTIVE_TURNS
        ACTIVE_TURNS += 1                    # the updater won't restart mid-answer
        before = memory_snapshot()
        turn = {"code": run_turn_code, "cloud": run_turn_cloud}.get(chat.get("brain"), run_turn)
        try:
            said = (body.get("text") or "").strip()
            if turn is run_turn_code and chat.get("inbox"):
                said = "\n\n".join(chat.pop("inbox")) + "\n\n---\n\n" + said
            turn(chat, said, attachments, emit)
        except RuntimeError as e:
            emit({"type": "error", "text": str(e)})
        except Exception as e:
            emit({"type": "error", "text": f"{type(e).__name__}: {e}"})
        ACTIVE_TURNS -= 1
        if load_config().get("git_sync") and memory_snapshot() != before:
            push_memory_async()
        emit({"type": "done", "title": chat["title"]})


# ------------------------------------------------------------ auto-update --
# Every minute: fetch, and if the branch moved, pull. If code changed, restart
# (after any answer in progress finishes); the page notices the new boot id
# and reloads. Commits that only touch notes (cloud_reply.md, memory.md, docs)
# are pulled quietly without a restart.

BOOT_ID = uuid.uuid4().hex
ACTIVE_TURNS = 0
UPDATE_EVERY_SEC = 60
NO_RESTART_NEEDED = {"cloud_reply.md", "memory.md", "README.md", "CLAUDE.md", ".gitignore", "test"}


UPDATE_NOTE = ""     # shown on the page when an update can't go through by itself


def commit_self_edits():
    """Cloude edits its own files. Before pulling, save those edits as a commit
    (code and notes only, never chats, uploads, keys or game runtime files), so
    an update can never set them aside or lose them."""
    git("add", "-u")
    untracked = git("ls-files", "--others", "--exclude-standard").stdout.split()
    keep = [f for f in untracked
            if (f.endswith((".py", ".js", ".md", ".txt", ".json")) and "/" not in f) or f.startswith("static/")]
    if keep:
        git("add", "--", *keep)
    if git("diff", "--cached", "--quiet").returncode != 0:
        git("-c", "user.name=Cloude", "-c", "user.email=cloude@localhost",
            "commit", "-q", "-m", "Cloude: self-edits on this PC")


def update_once():
    """Pull new commits. Returns True if Cloude should restart to use them."""
    global UPDATE_NOTE
    if not repo_root():
        return False
    if not git("fetch", "-q", timeout=60):
        return False
    commit_self_edits()
    head = git("rev-parse", "HEAD").stdout.strip()
    upstream = git("rev-parse", "@{u}")
    if upstream.returncode != 0:
        return False
    behind = git("rev-list", "--count", "HEAD..@{u}").stdout.strip() not in ("", "0")
    if not behind:
        if git("rev-list", "--count", "@{u}..HEAD").stdout.strip() not in ("", "0"):
            git("push", "-q", timeout=120)              # share self-edits and notes
        return False
    changed = git("diff", "--name-only", "HEAD...@{u}").stdout.split()    # upstream's side only
    pulled = git("pull", "-q", "--rebase", timeout=120)
    if not pulled or pulled.returncode != 0:
        # Both sides changed the same lines. Keep this PC's version running,
        # put it on its own branch so it can be merged by hand, and say so.
        git("rebase", "--abort")
        git("push", "-q", "-f", "origin", "HEAD:cloude-pc-edits", timeout=120)
        UPDATE_NOTE = ("An update and my own edits changed the same code, so I kept my version. "
                       "It's on the cloude-pc-edits branch for merging.")
        print("update:", UPDATE_NOTE)
        return False
    UPDATE_NOTE = ""
    git("push", "-q", timeout=120)                      # self-edits reach GitHub too
    code = [f for f in changed if f not in NO_RESTART_NEEDED and not f.startswith("fixed/")]
    if "requirements.txt" in code:
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "-r", str(APP_DIR / "requirements.txt")],
                       cwd=APP_DIR, timeout=600)
    if code:
        print("update: pulled new code:", ", ".join(code))
    return bool(code)


def update_loop():
    while True:
        time.sleep(UPDATE_EVERY_SEC)
        try:
            if load_config().get("auto_update") and update_once():
                while ACTIVE_TURNS > 0:          # let the current answer finish
                    time.sleep(2)
                print("update: restarting with the new version")
                restart()
        except Exception as e:
            print(f"update check failed: {e}")


def restart():
    """Start a fresh copy of this program, so code Cloude just edited takes effect.
    In window mode the new copy opens a fresh window; in browser mode the page
    reloads itself, so no new tab is opened."""
    args = [sys.executable, str(APP_DIR / "app.py")]
    if not WINDOW_MODE:
        args.append("--no-browser")
    subprocess.Popen(args, cwd=APP_DIR)
    os._exit(0)


def open_window(url):
    """Show Cloude in its own app window (pywebview). Returns False if that
    isn't possible here, so the caller can fall back to the browser."""
    try:
        import webview
    except ImportError:
        return False
    try:
        webview.create_window("Cloude", url, width=1150, height=800, min_size=(380, 500))
        # private_mode off + a storage folder: the window remembers your skin choice
        webview.start(private_mode=False, storage_path=str(APP_DIR / ".window"))
    except Exception as e:                       # no GUI backend, etc.
        print(f"Couldn't open the app window ({e}); using the browser instead.")
        return False
    return True


WINDOW_MODE = False


def main():
    global WINDOW_MODE
    for attempt in range(20):           # after a restart the old copy may still hold the port
        try:
            server = ThreadingHTTPServer((HOST, PORT), Handler)
            break
        except OSError:
            if attempt == 19:
                raise
            time.sleep(0.5)
    threading.Thread(target=seat_runner, daemon=True).start()
    url = f"http://{HOST}:{PORT}"
    print(f"Cloude is up at {url}  (Ctrl+C to stop)")
    threading.Thread(target=mailbox_loop, daemon=True).start()
    threading.Thread(target=update_loop, daemon=True).start()
    if "--browser" not in sys.argv and "--no-browser" not in sys.argv:
        # Its own window: the server runs in the background and Cloude closes
        # when the window does.
        threading.Thread(target=server.serve_forever, daemon=True).start()
        WINDOW_MODE = True
        if open_window(url):
            os._exit(0)
        WINDOW_MODE = False
        server.shutdown()
        threading.Timer(0.3, lambda: webbrowser.open(url)).start()
    elif "--no-browser" not in sys.argv:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nBye!")


if __name__ == "__main__":
    main()
