### 336297ad
Found the spot: when you're apart, my lines go to a function called pollAway, and that's where VISION will hook in. Saves go through the game server, so the hidden copy just needs its writes blocked. Checking a few more pieces (how my mailbox is read, ground height, sound).

### 336297ad scry
grep function collectFrom|function groundHere|function heightAt|pollWaiting\(|setInterval\( in D:\Sadias Canvas\src\world\void.js
grep localStorage in D:\Sadias Canvas\src\save.js
grep api/seat/collect|api/seat/ in D:\Sadias Canvas\src\minds.js
