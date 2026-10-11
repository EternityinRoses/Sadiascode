"""Load the "brains" logs and turn them into training examples.

Each brains/<run>/<pid>.json file holds one NPC's diary (notes), lines it
spoke (said) and its last few LLM exchanges (history: alternating user
prompt / assistant JSON reply). Every prompt->reply pair is one example.

Labels are cleaned with the game's own feedback: when the next prompt starts
"These steps couldn't be done: eat.", the "eat" step is marked as failed so
the model learns not to imitate actions the game rejected.
"""
import hashlib
import json
import os
import tarfile

from .parse import parse_prompt


def _iter_files(source):
    """Yield (run, pid, dict) from a brains directory or a .tar.gz of it."""
    if os.path.isdir(source):
        root = os.path.join(source, "brains") if os.path.isdir(os.path.join(source, "brains")) else source
        for run in sorted(os.listdir(root)):
            run_dir = os.path.join(root, run)
            if not os.path.isdir(run_dir):
                continue
            for fn in sorted(os.listdir(run_dir)):
                if fn.endswith(".json"):
                    with open(os.path.join(run_dir, fn), encoding="utf-8") as f:
                        yield run, fn[:-5], json.load(f)
    else:
        with tarfile.open(source, "r:*") as tar:
            for member in sorted(tar.getmembers(), key=lambda m: m.name):
                parts = member.name.split("/")
                if member.isfile() and member.name.endswith(".json") and len(parts) >= 2:
                    data = json.load(tar.extractfile(member))
                    yield parts[-2], parts[-1][:-5], data


def _content(msg):
    c = msg.get("content", "")
    if isinstance(c, list):
        c = "".join(part.get("text", "") for part in c if isinstance(part, dict))
    return c


def load_examples(source):
    """Return (examples, roster) where roster maps run -> set of NPC names."""
    examples, roster = [], {}
    for run, pid, data in _iter_files(source):
        if data.get("name"):
            roster.setdefault(run, set()).add(data["name"])
        hist = data.get("history", [])
        for i in range(0, len(hist) - 1, 2):
            if hist[i].get("role") != "user" or hist[i + 1].get("role") != "assistant":
                continue
            prompt, reply = _content(hist[i]), _content(hist[i + 1])
            try:
                response = json.loads(reply)
            except ValueError:
                continue
            if not isinstance(response, dict):
                continue
            state = parse_prompt(prompt)
            if state["name"]:
                roster.setdefault(run, set()).add(state["name"])
            failed = []
            if i + 2 < len(hist):
                failed = parse_prompt(_content(hist[i + 2]))["failed"]
            examples.append({
                "run": run, "pid": pid, "turn": i // 2,
                "prompt": prompt, "response": response,
                "state": state, "failed_after": failed,
            })
    return examples, roster


def split_by_run(examples, test_fraction=0.2):
    """Hold out whole runs so the test set is a town the model never saw."""
    def is_test(run):
        h = int(hashlib.md5(run.encode()).hexdigest(), 16) % 1000
        return h < test_fraction * 1000
    train = [e for e in examples if not is_test(e["run"])]
    test = [e for e in examples if is_test(e["run"])]
    return train, test


def clean_response(ex):
    """The reply with steps the game rejected removed from the agenda."""
    r = dict(ex["response"])
    if "agenda" in r and ex["failed_after"]:
        bad = set(ex["failed_after"])
        r["agenda"] = [a for a in r["agenda"] if a not in bad]
    return r


def export_chat_jsonl(examples, path):
    """Write examples as chat-format JSONL for fine-tuning an LLM elsewhere."""
    n = 0
    with open(path, "w", encoding="utf-8") as f:
        for ex in examples:
            r = clean_response(ex)
            if ex["state"]["kind"] == "plan" and not r.get("agenda"):
                continue
            f.write(json.dumps({"messages": [
                {"role": "user", "content": ex["prompt"]},
                {"role": "assistant", "content": json.dumps(r, ensure_ascii=False)},
            ]}, ensure_ascii=False) + "\n")
            n += 1
    return n
