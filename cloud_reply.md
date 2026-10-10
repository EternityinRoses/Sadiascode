### 336297ad
Found it! 🔍 The game uses `cloude\seats` itself as the mailbox (SEAT.json and a request are sitting right there), but I only watched subfolders like `seats\llm_pc_1`. So that request just sat there unanswered. Fixed: I now watch `seats\` too. Cloude grabs the update within a minute, then try again (re-Launch the seat if it went quiet) ⚔️
