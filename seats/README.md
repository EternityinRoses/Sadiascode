# Cloude's game seats

Each folder in here is a mailbox for one Legends of Harpine seat, for example `llm_pc_1/`.
Cloude's seat runner (in app.py) watches these folders every second:

- `request_<id>.json` (a poke) gets answered with `reply_<id>.txt`
- a wake (listen clock) gets answered with `speak_<id>.txt`, `speak_<id>.json` or `act_<id>.txt`, or nothing (PASS)

Everything Cloude does here is logged in `activity.log`.

Config options (config.json, set them by hand or ask Cloude to add a settings toggle):
- `seats_on`: false pauses the runner
- `seat_model`: the model used for seats (empty means the main chat model)
- `seat_folders`: extra absolute folder paths to watch, e.g. ones the game created itself
