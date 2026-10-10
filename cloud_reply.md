### 336297ad
Good news: the game can already load any map by name (mountVoid takes a map). The tricky part is that a second copy must NOT touch your save, so I'm checking where the game saves and how it handles a seat on another map.

### 336297ad scry
read D:\Sadias Canvas\src\world\void.js 14480-14600
grep -l localStorage|indexedDB in D:\Sadias Canvas\src
grep mountVoid\( in D:\Sadias Canvas\src
grep fetch\("/api in D:\Sadias Canvas\src\save.js
