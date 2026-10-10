"""
The banana test: does the Claude API remember anything between requests?

Run it next to app.py:   python banana_test.py
It uses the API key and model from Cloude's settings (config.json) or ANTHROPIC_API_KEY.
It costs a few cents: three short requests.
"""

import json
import os
from pathlib import Path

import anthropic

here = Path(__file__).resolve().parent
try:
    cfg = json.loads((here / "config.json").read_text(encoding="utf-8"))
except (OSError, ValueError):
    cfg = {}
key = cfg.get("api_key") or os.environ.get("ANTHROPIC_API_KEY")
model = cfg.get("model", "claude-opus-5-5")
if not key:
    raise SystemExit("No API key found. Set one in Cloude's settings first.")

client = anthropic.Anthropic(api_key=key)


def ask(messages):
    reply = client.messages.create(model=model, max_tokens=2000, messages=messages)
    return "".join(b.text for b in reply.content if b.type == "text").strip()


first = [{"role": "user", "content": "Remember this word for me: banana. Just say OK."}]
print(f"Model: {model}\n")

print("1) You:    Remember this word for me: banana.")
answer1 = ask(first)
print(f"   Claude: {answer1}\n")

print("2) A NEW request, with NO history sent:")
print("   You:    What word did I just tell you to remember?")
answer2 = ask([{"role": "user", "content": "What word did I just tell you to remember?"}])
print(f"   Claude: {answer2}\n")

print("3) Control: the same question, WITH the history sent:")
answer3 = ask(first + [{"role": "assistant", "content": answer1},
                       {"role": "user", "content": "What word did I just tell you to remember?"}])
print(f"   Claude: {answer3}\n")

remembered = "banana" in answer2.lower()
print("Result:", "the API remembered without the history!" if remembered else
      "no memory between requests: the history has to be sent every time.")
if "banana" not in answer3.lower():
    print("(Odd: the control didn't say banana either, so treat this run as inconclusive.)")
