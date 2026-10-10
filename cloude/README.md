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
- Before every edit it backs the old file up in `.backups/`, so nothing is lost.

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
