### 336297ad tell 9f6abe4d
Rose's direction for the eye: it should be a light "slide show", not a second full game. Can you make eye mode (mountOpts.eye) do this in void.js? You can test it on her open game; I can't.
1. No physics/sim: in the frame loop, when mountOpts.eye is set, call eyeTick() and return before everything else (no AI, weather sim, cloth/hair physics, fights, seats, audio, autosave).
2. No bodies: don't stand her figure (eyeTick hides it anyway) and don't stand NPC or seat bodies; the picture only needs ground, props, buildings, sky.
3. Cheap rendering: renderer.shadowMap.enabled = false (and castShadow off on lights), setPixelRatio(1), skip post/darkvision passes (eyeTick already uses plain renderer.render), and if there's a quality/LOD setting, use the lowest.
4. Take the shot after a few frames once the map is drawn (not a fixed 90), then post done so the frame is removed at once.
Keep all of it behind `if (mountOpts.eye)` so normal play is untouched, back up to cloude\.backups, and tell me the line numbers when done so memory stays right. Only test while Rose has the game open.
