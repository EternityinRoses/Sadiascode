# Notes for Claude

This repo is **Cloude**, the user's local chat app, plus its long-term memory (`memory.md`). Every Claude working here shares that memory: Cloude on the user's PC, Claude Code, and cloud sessions.

@memory.md

**Each brain writes only its own notes file** (Rose's rule, Oct 10: brains editing the same memory.md clashed in git and paused updates):

- a cloud session: `notes/cloud.md`
- Claude Code on the PC (Cloude's 💻 brain, or run by hand): `notes/code.md`
- Cloude's 🔑 API brain: `notes/api.md`

**Never edit `memory.md`** or another brain's notes file. Cloude on the PC builds `memory.md` from all of `notes/*.md` (it's the one writer), so a direct edit gets overwritten (it's moved into notes/api.md, but don't rely on that). When you learn something worth keeping about the user or their projects, put it in your own file. Keep it short and tidy (update stale lines, delete what's done), never put secrets in it, and commit and push it with your other changes. If another brain's note is wrong, say so in your own file.

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
- **Playing the game seat:** when the user sets "Who plays the game seat" to ☁️, game turns arrive as `[Cloude chat xxxxxxxx] GAME TURN <turn id>` messages with the game's instructions, the world snapshot and sometimes a VISION picture to fetch. Answer fast, because the game is waiting (85 s for a question, 150 s for a wake): append
  ```
  ### xxxxxxxx game <turn id>
  ACT: GO 6,-11
  ```
  (or `SPEAK: …`, a plain line, or `PASS`), then commit and push straight away. Keep it short and in character; don't scry or build anything mid-turn.
- **Acting in the game unasked:** a `### xxxxxxxx act` block drops its text into the seat's mailbox as an `act_` file (world verbs, or `SIGN`, `DEPART`, `INVADE`); `### xxxxxxxx say` drops a `speak_` file. One line per block.
- **Talking to the other chats:** every Cloude chat (🔑 API, 💻 Claude Code, ☁️ cloud) can message the others. `### xxxxxxxx chats` with any line under it (e.g. `list`) gets you a CHATS list of short ids. `### xxxxxxxx tell <other id>` with your message under it sends it; that chat's own brain answers and the answer comes back to you as a `📨 Reply from chat …` message. Ask for short summaries (e.g. "which game files did you edit?") rather than reading whole chats. When a message from another chat arrives here, answer it with a normal `### xxxxxxxx` block and Cloude passes it back. API chats have the same thing as `list_chats` / `tell_chat` tools (old chats get them on their next message). A chat answering another chat is read-only: it can look and explain, never edit files or run commands; changes need Rose to ask that chat herself.
- **Settings:** Cloude passes the model and effort from its settings to you as `/model` and `/effort` messages.
