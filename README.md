# Sadiascode: NPC brain

A small NPC AI trained on the game's own LLM logs (`data/brains.tar.gz`). It
reads the same `PLAN` / `TALK` prompt text the game sends to the LLM and
answers with the same JSON, so it can stand in for the LLM call. It runs on a
CPU, offline, with no per-call cost.

## Quick start

```bash
pip install numpy
python -m npc_ai.train                 # trains, prints held-out scores, writes models/npc_brain.json
python -m npc_ai.serve --port 8765     # HTTP server the game can call
python -m unittest discover -s tests -t .
```

A trained model is already committed at `models/npc_brain.json`, so `serve`
works without training first.

## Plugging it into the game

Send the prompt you would have sent the LLM:

```js
const res = await fetch("http://127.0.0.1:8765/reply", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt: promptText }),   // or { messages: [...] }
});
const reply = await res.json();   // {"agenda": [...], "policy": {...}, "say": "...", ...}
```

The server keeps a little memory per NPC (the `id pN` in the prompt), so it
doesn't repeat the same diary note or line.

## What it learns

| Part | How | Held-out result (4 unseen towns) |
|---|---|---|
| Which action to take | Scores each action the game offers against the NPC's state (purse, hunger, time, job, election...) | Matches the LLM's choice **59%** of the time. Simple baselines: 31% (first listed), 36% (most common action) |
| Policy weights (work, crime, ...) | Ridge regression from state | Average error **0.24** on the 0-3 scale (0.32 for always guessing the average) |
| Votes | Rules: own pledge, else self if standing, else the sitting mayor | Agrees with the LLM **93%** of the time |
| Spoken lines | Picks from 1,172 real LLM lines, with names swapped for slots (`{me}`, `{them}`) | No score; see limits below |
| Deals, fighting stance, captain/boss votes | Rules on the parsed state | - |

Training labels are cleaned with the game's feedback. When the next prompt
says "These steps couldn't be done: eat", that step is dropped from the
target. On held-out turns where the LLM's step was rejected, the brain chose
that same step 3 times out of 42.

## Limits

* **Dialogue is the weak part.** There are only about 330 conversation
  examples, so a picked line often fits the mood but not exactly what was
  said. For better speech, keep using an LLM for `say` only, or fine-tune one
  on the chat export below.
* It copies the logs' habits. NPCs are law-abiding and back the sitting
  mayor, because the LLM NPCs did.
* It only handles the prompt formats in the logs. Mayor-only keys (taxes,
  wages, bounties) and offers it makes itself are not produced.
* About 2,900 examples from 22 runs is a small dataset. More play logs will
  help most; drop new `brains/` folders in and re-run `train`.

## Fine-tuning an LLM instead

```bash
python -m npc_ai.train --export-chat data/npc_chat.jsonl
```

This writes one `{"messages": [user prompt, assistant reply]}` line per
example, with rejected steps removed, in the format most fine-tuning tools
accept.

## Layout

```
data/brains.tar.gz     the uploaded logs (25 runs, 593 NPC files)
npc_ai/parse.py        prompt text -> state
npc_ai/dataset.py      logs -> examples, label cleaning, chat export
npc_ai/model.py        the brain: action scorer, policy regressor, voice bank, rules
npc_ai/train.py        training + held-out evaluation
npc_ai/serve.py        HTTP / stdin server
models/npc_brain.json  trained model
tests/                 unit tests
```

## Running Hollow Town generations headless

`tools/generations.mjs` runs the town's own simulation (`sim.js`) in Node with
plain brains only: no browser and no AI calls. It carries the learned lore
from one generation to the next, as the page does. One generation takes
about 5-25 seconds.

```bash
node tools/generations.mjs path/to/town 40 path/to/town/lore.json lore.after.json
REMEMBER=1 node tools/generations.mjs path/to/town 40 -    # towns that already know beasts come
```

Each line says whether the town won or failed, the day it failed, deaths by
cause, and how often people barricaded, built the palisade or lit watch-fires.
