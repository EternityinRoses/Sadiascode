"""Train the NPC brain on the brains logs and report how well it imitates them.

    python -m npc_ai.train                       # uses data/brains.tar.gz
    python -m npc_ai.train --data path/to/brains --out models/npc_brain.json
    python -m npc_ai.train --export-chat data/npc_chat.jsonl   # for LLM fine-tuning

Evaluation holds out whole runs (towns the model never saw during training).
"""
import argparse
import json
import os
from collections import Counter

import numpy as np

from .dataset import export_chat_jsonl, load_examples, split_by_run
from .model import POLICY_KEYS, NPCBrain, candidates, state_features, verb_of


def evaluate(brain, train, test):
    plans = [e for e in test if e["state"]["kind"] == "plan"]
    prior = Counter()
    for ex in train:
        if ex["state"]["kind"] == "plan":
            cands, t = NPCBrain.action_target(ex)
            if t is not None:
                prior[verb_of(cands[t])] += 1

    hits = first_hits = prior_hits = n = 0
    rejected_n = rejected_repeat = 0
    for ex in plans:
        cands, t = NPCBrain.action_target(ex)
        if t is None or len(cands) < 2:
            continue
        n += 1
        top = brain.action_probs(ex["state"])[0][0]
        hits += verb_of(top) == verb_of(cands[t])
        first_hits += verb_of(cands[0]) == verb_of(cands[t])
        best = max(cands, key=lambda c: prior[verb_of(c)])
        prior_hits += verb_of(best) == verb_of(cands[t])
        if ex["failed_after"]:
            rejected_n += 1
            rejected_repeat += top in ex["failed_after"]

    Y, P, M = [], [], []
    mean = np.zeros(len(POLICY_KEYS))
    tr = [e["response"]["policy"] for e in train if isinstance(e["response"].get("policy"), dict)]
    mean = np.array([np.mean([float(p.get(k, 0) or 0) for p in tr]) for k in POLICY_KEYS])
    for ex in plans:
        pol = ex["response"].get("policy")
        if isinstance(pol, dict):
            try:
                Y.append([float(pol.get(k, 0) or 0) for k in POLICY_KEYS])
            except (TypeError, ValueError):
                continue
            lean = brain.lean(ex["state"])
            P.append([lean[k] for k in POLICY_KEYS])
            M.append(mean)
    Y, P, M = np.array(Y), np.array(P), np.array(M)

    votes = [(brain._vote(e["state"]), e["response"]["vote_for"]) for e in plans
             if e["state"]["ballot"] and isinstance(e["response"].get("vote_for"), str)]
    talks = [e for e in test if e["state"]["kind"] == "talk"]
    offers = [(brain._judge_offer(e["state"]), e["response"]["accept"]) for e in talks
              if e["state"]["offer"] and isinstance(e["response"].get("accept"), bool)]
    return {
        "test_runs": sorted({e["run"] for e in test}),
        "plan_examples": n,
        "action_match": hits / max(1, n),
        "baseline_first_listed": first_hits / max(1, n),
        "baseline_most_common": prior_hits / max(1, n),
        "repeats_rejected_step": "%d/%d" % (rejected_repeat, rejected_n),
        "policy_mae": float(np.abs(Y - P).mean()) if len(Y) else None,
        "policy_mae_baseline_mean": float(np.abs(Y - M).mean()) if len(Y) else None,
        "vote_match": sum(a == b for a, b in votes) / max(1, len(votes)),
        "vote_examples": len(votes),
        "offer_match": "%d/%d" % (sum(a == b for a, b in offers), len(offers)),
        "voice_lines": len(brain.bank),
    }


def main(argv=None):
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", default=os.path.join(here, "data", "brains.tar.gz"),
                    help="brains directory or .tar.gz of it")
    ap.add_argument("--out", default=os.path.join(here, "models", "npc_brain.json"))
    ap.add_argument("--export-chat", help="also write chat-format JSONL for LLM fine-tuning")
    ap.add_argument("--no-eval", action="store_true", help="skip the held-out evaluation")
    args = ap.parse_args(argv)

    examples, roster = load_examples(args.data)
    print("loaded %d prompt/reply pairs from %d runs" % (len(examples), len({e['run'] for e in examples})))

    if not args.no_eval:
        train, test = split_by_run(examples)
        report = evaluate(NPCBrain().fit(train, roster), train, test)
        print("held-out evaluation:")
        print(json.dumps(report, indent=2))

    brain = NPCBrain().fit(examples, roster)
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    brain.save(args.out)
    print("saved model trained on all data to", args.out)

    if args.export_chat:
        n = export_chat_jsonl(examples, args.export_chat)
        print("wrote %d chat examples to %s" % (n, args.export_chat))


if __name__ == "__main__":
    main()
