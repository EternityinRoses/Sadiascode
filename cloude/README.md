# Cloude ☁️

A cozy little chat app for Claude that runs on your own computer with your own API key.

- Talks to **Claude Opus 5.5** at **medium** effort (change either in ⚙ settings).
- Send **pictures, PDFs and files**: 📎 button, drag and drop, or paste.
- Shows what it's **thinking** (tap 💭) and what it's doing (little tool pills).
- Saves your chats on your computer, in `chats/`.
- **Builds itself:** Cloude can read and edit its own files in this folder. Ask it for a feature, then:
  - changed `static/` files: reload the page
  - changed `app.py`: press **↻ Restart** (top right)
  - changed `system_prompt.md`: start a **new chat**
- Shell commands (like installing a package) **always wait for you to press Allow**.
- **Remembers things** in `memory.md`, which it reads at the start of every new chat and adds to by itself. It starts with notes from the Claude session that built it.
- Before every edit it backs the old file up in `.backups/`, so nothing is lost.

## Three brains, three credit pools

Pick one in ⚙ settings. New chats use it; old chats keep the brain they started with (the chat list shows 🔑 💻 ☁️).

| Brain | Spends | How it works |
|---|---|---|
| 🔑 **API key** | API credits (console.anthropic.com) | Streams here, with Cloude's own tools. Needs your API key. |
| 💻 **Claude Code on this PC** | Claude Code's credit for scripted use (`claude -p`) | Runs the `claude` program on your PC and streams the answer here. Install Claude Code and run `claude auth login` once. With auto-run off it can edit files but not run commands. |
| ☁️ **Cloud session** | Cloud-session credit, then your plan's usage | Hands the chat to a Claude Code cloud session. **Replies show up in the Claude app** (Cloude gives you the link); anything it pushes to GitHub comes back here. Needs `claude` signed in and Cloude inside a git clone. |

Your normal subscription chat (the Claude app, or `claude` in a terminal) is a fourth pool, and it's used directly rather than through Cloude.

### Shared memory

All brains read `memory.md`. Turn on **Share my memory through GitHub** in settings (it's on by default) and run Cloude from a **git clone** instead of a zip. Then Cloude pulls new notes when a chat starts and pushes `memory.md` when it changes. Cloud sessions read the same notes through the repo's `CLAUDE.md`.

```
git clone https://github.com/EternityinRoses/Sadiascode.git
cd Sadiascode
git checkout claude/are-you-claude-93fk26
cd cloude
start.bat            (or ./start.sh)
```

## Start it

You need Python 3.10 or newer.

**Windows:** double-click `start.bat`.
**Mac/Linux:** run `./start.sh`.

Or by hand:

```
pip install -r requirements.txt
python app.py
```

It opens http://127.0.0.1:8640 in your browser. The first time, it asks for your API key (from https://console.anthropic.com). The key is saved in `config.json` in this folder, which `.gitignore` keeps out of git. You can also set `ANTHROPIC_API_KEY` instead.

## Good to know

- It only listens on your own computer (127.0.0.1), so other devices can't reach it.
- Cloude's file tools can only touch this folder, and they never read `config.json`.
- If a safety check declines a request, Anthropic automatically retries it on a backup model (`fallbacks: "default"`), and the chat says so.
- Use a different port with `CLOUDE_PORT=9000 python app.py`.
- If Cloude breaks its own code and won't start, copy the last good file back from `.backups/`. Each backup is named `time__path`.
