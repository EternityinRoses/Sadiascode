@echo off
rem Train the NPC brain on everything Hollow Town has recorded (dataset.jsonl). Reload the town page afterwards.
cd /d %~dp0
node train_brain.js 6
node train_fight.mjs 30
pause
