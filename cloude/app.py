"""
Cloude: a small local chat agent for Claude, with a cute web UI.

Run it with `python app.py`, then open http://127.0.0.1:8640 (it opens itself).
Everything lives in this folder: the code, the chats, your uploads, and the
backups Cloude makes before it edits its own files.

Cloude can read and edit the files in this folder, so it can grow itself:
ask it for a feature, it edits app.py / static/*, and you press Restart.
Shell commands always wait for you to press Allow in the chat first.
"""

import base64
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

HOST = "127.0.0.1"          # only this computer can reach it
PORT = int(os.environ.get("CLOUDE_PORT", "8640"))

DEFAULTS = {"model": "claude-opus-5-5", "effort": "medium", "max_tokens": 32000}
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
]


class ToolError(Exception):
    pass


def safe_path(rel):
    """Resolve a model-supplied path and refuse anything outside APP_DIR."""
    if not isinstance(rel, str) or not rel.strip():
        rel = "."
    target = (APP_DIR / rel).resolve()
    if not target.is_relative_to(APP_DIR):
        raise ToolError("That path is outside my folder.")
    return target


def backup(target):
    if target.is_file():
        stamp = time.strftime("%Y%m%d-%H%M%S")
        rel = target.relative_to(APP_DIR)
        dest = BACKUPS_DIR / f"{stamp}__{str(rel).replace(os.sep, '__')}"
        shutil.copy2(target, dest)


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
    return f"Wrote {target.relative_to(APP_DIR)} ({len(args['content'])} chars)."


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
    return f"Edited {target.relative_to(APP_DIR)}."


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
}


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


def new_chat():
    # The system prompt and tool list are frozen per chat: the API rejects
    # replayed thinking blocks if either changes under an existing conversation.
    # So when Cloude edits its own prompt or tools, it shows up in new chats.
    chat = {
        "id": uuid.uuid4().hex,
        "title": "New chat",
        "created": time.time(),
        "system": SYSTEM_FILE.read_text(encoding="utf-8") if SYSTEM_FILE.exists() else "",
        "tools": TOOLS,
        "messages": [],     # exactly what is sent to the API, append-only
        "display": [],      # what the page shows
    }
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
            rows.append({"id": c["id"], "title": c["title"], "created": c["created"]})
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


def run_turn(chat, user_text, attachments, emit):
    """Send one user message and keep going through tool calls. `emit(dict)`
    streams events to the page."""
    cfg = load_config()
    client = make_client()

    content = []
    for att in attachments:
        content.extend(attachment_blocks(att))
    if user_text:
        content.append({"type": "text", "text": user_text})
    if not content:
        return
    start_len = len(chat["messages"])
    chat["messages"].append({"role": "user", "content": content})
    chat["display"].append({"role": "user", "text": user_text,
                            "files": [{k: a[k] for k in ("name", "kind", "url")} for a in attachments]})
    if chat["title"] == "New chat":
        chat["title"] = (user_text or (attachments[0]["name"] if attachments else "Chat"))[:48]
    save_chat(chat)

    shown = {"role": "assistant", "text": "", "thoughts": "", "tools": []}
    schemas = {t["name"]: t["input_schema"] for t in chat["tools"]}
    json_retries = 0

    try:
        for _ in range(MAX_TOOL_ROUNDS):
            new_round = True
            try:
                with client.beta.messages.stream(
                    model=cfg["model"],
                    max_tokens=int(cfg["max_tokens"]),
                    system=chat["system"] or anthropic.omit,
                    tools=chat["tools"],
                    messages=chat["messages"],
                    thinking={"type": "adaptive", "display": "summarized"},
                    output_config={"effort": cfg["effort"]},
                    cache_control={"type": "ephemeral"},
                    # If a safety check declines, Anthropic retries on its
                    # recommended model instead of just stopping.
                    betas=["server-side-fallback-2026-07-01"],
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
                    if name not in TOOL_FUNCS:
                        raise ToolError(f"Unknown tool {name}.")
                    if not valid_input(name, args, schemas.get(name, {})):
                        raise ToolError("The tool input came through garbled; please try again.")
                    if name == "run_command":
                        approval_id = uuid.uuid4().hex
                        with APPROVAL_LOCK:
                            APPROVALS[approval_id] = {"event": threading.Event(), "ok": False}
                        emit({"type": "approve", "id": approval_id, "command": args["command"]})
                        if not wait_for_approval(approval_id):
                            raise ToolError("The user said no to running that command.")
                    out = TOOL_FUNCS[name](args)
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
            return self.send_json({"has_key": bool(api_key()), "model": cfg["model"], "effort": cfg["effort"]})
        if path == "/api/chats":
            return self.send_json(list_chats())
        if path.startswith("/api/chats/"):
            try:
                chat = load_chat(path.rsplit("/", 1)[1])
            except (ValueError, OSError):
                return self.send_error(404)
            return self.send_json({"id": chat["id"], "title": chat["title"], "display": chat["display"]})
        self.send_error(404)

    def do_POST(self):
        if not self.same_origin():
            return self.send_error(403)
        path = urlparse(self.path).path
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
            chat = new_chat()
            return self.send_json({"id": chat["id"]})
        if path == "/api/delete":
            try:
                chat_path(body.get("id")).unlink(missing_ok=True)
            except ValueError:
                pass
            return self.send_json({"ok": True})
        if path == "/api/restart":
            self.send_json({"ok": True})
            threading.Timer(0.5, restart).start()
            return
        if path == "/api/chat":
            return self.stream_chat(body)
        self.send_error(404)

    def stream_chat(self, body):
        try:
            chat = load_chat(body["chat_id"]) if body.get("chat_id") else new_chat()
        except (ValueError, OSError):
            chat = new_chat()
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

        emit({"type": "start", "chat_id": chat["id"]})
        try:
            run_turn(chat, (body.get("text") or "").strip(), attachments, emit)
        except RuntimeError as e:
            emit({"type": "error", "text": str(e)})
        except Exception as e:
            emit({"type": "error", "text": f"{type(e).__name__}: {e}"})
        emit({"type": "done", "title": chat["title"]})


def restart():
    """Start a fresh copy of this program, so code Cloude just edited takes effect."""
    subprocess.Popen([sys.executable, str(APP_DIR / "app.py"), "--no-browser"], cwd=APP_DIR)
    os._exit(0)


def main():
    for attempt in range(20):           # after a restart the old copy may still hold the port
        try:
            server = ThreadingHTTPServer((HOST, PORT), Handler)
            break
        except OSError:
            if attempt == 19:
                raise
            time.sleep(0.5)
    url = f"http://{HOST}:{PORT}"
    print(f"Cloude is up at {url}  (Ctrl+C to stop)")
    if "--no-browser" not in sys.argv:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nBye!")


if __name__ == "__main__":
    main()
