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

Pick one in ⚙ settings. Switching opens a new chat on the new brain and hands it the conversation so far, so it picks up where you left off. Old chats keep the brain they started with (the chat list shows 🔑 💻 ☁️).

| Brain | Spends | How it works |
|---|---|---|
| 🔑 **API key** | API credits (console.anthropic.com) | Streams here, with Cloude's own tools. Needs your API key. |
| 💻 **Claude Code on this PC** | Claude Code's credit for scripted use (`claude -p`) | Runs the `claude` program on your PC and streams the answer here. Install Claude Code and run `claude auth login` once. With auto-run off it can edit files but not run commands. |
| ☁️ **Cloud session** | Cloud-session credit, then your plan's usage | Hands the chat to a Claude Code cloud session. Press **🔄** to pull its replies in (Cloude teleports the session into a scratch copy, `.cloud_mirror/`, reads the replies and closes it), or read them in the Claude app. Needs `claude` signed in and Cloude inside a git clone. |

Your normal subscription chat (the Claude app, or `claude` in a terminal) is a fourth pool, and it's used directly rather than through Cloude.

### Shared memory

All brains read `memory.md`. Turn on **Share my memory through GitHub** in settings (it's on by default) and run Cloude from a **git clone** instead of a zip. Then Cloude pulls new notes when a chat starts and pushes `memory.md` when it changes. Cloud sessions read the same notes through the repo's `CLAUDE.md`.

### Set up (Windows, Command Prompt)

This makes your `Desktop\cloude` folder a git clone, keeping your key and chats:

```
cd %USERPROFILE%\Desktop
ren cloude cloude_old
git clone -b claude/are-you-claude-93fk26 https://github.com/EternityinRoses/Sadiascode.git cloude
copy cloude_old\config.json cloude\
xcopy /E /I cloude_old\chats cloude\chats
cd cloude
python app.py
```

To get updates later: `git pull` inside `Desktop\cloude`.

### Keeping long chats cheap (API brain)

The API keeps no memory between requests (the banana test proved it), so every message resends the chat. Two things keep that cheap:

- **1-hour cache:** what was already sent is billed at a fraction of the price on the next message, even after a break of up to an hour. Set `"cache_ttl": "5m"` in `config.json` for the shorter, cheaper-to-write cache.
- **Auto-compact:** once a chat reaches about 100k tokens, the API summarizes the older part and only the summary counts from then on (you'll see 🧹 in the chat). Change the point with `"compact_at"` in `config.json` (minimum 50000).

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

## Its own window

If `pywebview` is installed (`pip install pywebview`), Cloude opens in its own app window instead of a browser tab, and closing the window quits Cloude. Without it, or with `python app.py --browser`, it opens in your browser as before.

## Good to know

- It only listens on your own computer (127.0.0.1), so other devices can't reach it.
- Cloude's file tools can only touch this folder, and they never read `config.json`.
- If a safety check declines a request, Anthropic automatically retries it on a backup model (`fallbacks: "default"`), and the chat says so.
- Use a different port with `CLOUDE_PORT=9000 python app.py`.
- If Cloude breaks its own code and won't start, copy the last good file back from `.backups/`. Each backup is named `time__path`.
