"""Run the trained NPC brain in place of the LLM.

HTTP (for the game):
    python -m npc_ai.serve --port 8765
    POST /reply  {"prompt": "<the PLAN/TALK text>"}            -> reply JSON
    POST /reply  {"messages": [{"role": "user", "content": ...}, ...]}
                 (chat-style; the last user message is answered)
    GET  /health

One-off from the shell:
    python -m npc_ai.serve --stdin < prompt.txt
"""
import argparse
import json
import os
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from .model import NPCBrain

DEFAULT_MODEL = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "npc_brain.json")


def prompt_from_request(body):
    if isinstance(body.get("prompt"), str):
        return body["prompt"]
    for msg in reversed(body.get("messages") or []):
        if msg.get("role") == "user":
            c = msg.get("content", "")
            if isinstance(c, list):
                c = "".join(p.get("text", "") for p in c if isinstance(p, dict))
            return c
    raise ValueError('send {"prompt": "..."} or {"messages": [...]}')


def make_handler(brain):
    lock = threading.Lock()

    class Handler(BaseHTTPRequestHandler):
        def _send(self, code, obj):
            data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(data)

        def do_OPTIONS(self):
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()

        def do_GET(self):
            if self.path == "/health":
                self._send(200, {"ok": True, "voice_lines": len(brain.bank)})
            else:
                self._send(404, {"error": "not found"})

        def do_POST(self):
            if self.path != "/reply":
                return self._send(404, {"error": "not found"})
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = json.loads(self.rfile.read(length) or b"{}")
                prompt = prompt_from_request(body)
            except (ValueError, AttributeError) as e:
                return self._send(400, {"error": str(e)})
            with lock:  # the brain keeps per-NPC memory
                reply = brain.reply(prompt)
            self._send(200, reply)

        def log_message(self, fmt, *args):
            pass

    return Handler


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--stdin", action="store_true", help="answer one prompt read from stdin and exit")
    args = ap.parse_args(argv)

    brain = NPCBrain.load(args.model)
    if args.stdin:
        print(json.dumps(brain.reply(sys.stdin.read()), ensure_ascii=False))
        return
    server = ThreadingHTTPServer((args.host, args.port), make_handler(brain))
    print("NPC brain listening on http://%s:%d/reply" % (args.host, args.port))
    server.serve_forever()


if __name__ == "__main__":
    main()
