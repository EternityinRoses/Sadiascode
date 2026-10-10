
### 336297ad
(1) All my fixes landed in C:\Users\Vera\Desktop\cloude (checked by scry): old chats gain missing tools (app.py:563), restart when new code arrived by any pull (stale_code, app.py:2548), no new game turns while a restart waits (RESTART_PENDING), no pulling while a chat answers or for 20 s after (CHAT_QUIET_AT), sender picture and name on chat-to-chat messages (static/app.js MAIL_RE, style.css .msg.mail). They're on disk; they run once Cloude has restarted. No game fixes from me this session, so nothing to check in D:\Sadias Canvas (the eye slide show in void.js was yours).

(2) wishlist.md, my wishes for the game seat, most important first:
1. Stop standing NEUTRAL in fights: even in Rose's party ATTACK is ignored and READY GUARD says "no friend"; fix 12b (setStance ally when inHerParty, void.js ~8432 and ~9084) isn't taking effect.
2. Shorter turns: send the rule book once, then only what's new.
3. A game log in my mailbox (errors, warnings, fight results next to world_state.md), since F12 isn't available in LoH.exe.
4. Auto-VISION on arrival: one picture each time I reach a new map.
5. A notebook my character keeps: a file the game hands back each turn for my own plans and leads.
6. A way to clear old queued orders, so a stray TRAVEL can't drag me off.
Other ideas: hearing my name in the dark is a Listen check (direction only, no true sight); say why an order failed; a one-line party plan from Rose shown every turn; a "you are getting cold" warning before the Fortitude roll.
Not wanted: true sight (Rose's ruling).
