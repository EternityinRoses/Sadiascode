# Notes for Claude

This repo is **Cloude**, the user's local chat app, plus its long-term memory (`memory.md`). Every Claude working here shares that memory: Cloude on the user's PC, Claude Code, and cloud sessions.

@memory.md

When you learn something worth keeping about the user or their projects, update `memory.md`. Keep it short and tidy, never put secrets in it, and commit it along with your other changes so the other copies see it.

## Replying to Cloude

Messages that start with `[Cloude chat xxxxxxxx]` come from the user's Cloude app on their PC, which can't see this session. Answer normally, then also put your reply where Cloude can read it:

1. `git pull --rebase` on your branch.
2. Append to `cloud_reply.md` in the repo root:
   ```
   ### xxxxxxxx
   your reply text
   ```
   using the same 8-character chat id from the message.
3. Commit and push. Cloude shows the reply in that chat within about 10 seconds and empties the file.

More you can do through the mailbox:

- **Progress notes:** on a long job, post short updates as you go ("reading the code…", "tests pass") as separate `### xxxxxxxx` blocks, so the user isn't left waiting in silence.
- **Ask before risky things:** use a `### xxxxxxxx ask` heading with a one-line question first (for example `Delete the old saves folder?`). Cloude shows Allow / Deny buttons, and the answer comes back to you as a message starting with `ALLOWED` or `DENIED`. Wait for it.
- **Files from the user:** attachments arrive on the `cloude-inbox` branch. The message lists their paths and how to fetch them (`git fetch -q origin cloude-inbox && git show origin/cloude-inbox:<path> > /tmp/<name>`). Open pictures with the Read tool.
- **Look at the user's PC (scry):** you can't see their drives, but Cloude can. Post a `### xxxxxxxx scry` block with one look-up per line:
  ```
  ### xxxxxxxx scry
  list D:\Sadias Canvas\src
  read D:\Sadias Canvas\src\pilot.js 100-250
  grep NEWS_WAKE_GAP in D:\Sadias Canvas\src
  find *.js in D:\Sadias Canvas\src\world
  ```
  Cloude runs them read-only and sends the results back as a message starting with `SCRY RESULT`. It only reaches Cloude's own folder and its approved folders (`extra_roots`, which includes `D:\Sadias Canvas`), never secrets like `config.json` or `.env`, and answers are cut at about 60k characters, so read big files in ranges.
- **Settings:** Cloude passes the model and effort from its settings to you as `/model` and `/effort` messages.
