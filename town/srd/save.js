/* ============================================================================
   THE SAVE BOOK (Rose 09-11: "tackle the memory", then "should be
   agnostic... if you're just saving what exists you're ignoring what will /
   what might exist").

   NOTHING HERE KNOWS WHAT A CHEST IS. A save is a book of pages, and every
   system that has something to remember writes its own page: it calls
   registerSaver(id, { phase, snapshot, restore }) once, at load, and from
   then on the book asks it at save time and hands the page back at load
   time. A system built next month registers the same way and is in every
   save from its first day; nothing in this file changes.

   THREE PHASES, by when the page is handed back:
     boot   before any world mounts: the creation record (state.js), the
            clock and the weather plan it carries (world/clock.js), the seat
            bodies' checkpoint (bodies.js). Restored by the app on Continue.
     world  once the world stands: her own state (the runner registers it).
     map    per map, kept under the map's key: the things standing on it,
            what lies on the ground (the runner registers these while it is
            up). A map she is not on keeps its page until she returns.

   THE BOOK LIVES IN MEMORY while the game runs, so walking between maps
   carries every map's page along; Save writes it to disc (saves/<name>.save
   .json through the sheet shelf's own door), Continue and Load read it back.
   A reload without a save loses the session, on purpose: the save is the
   arbiter (bodies.js's own law for the seats, now hers too).
   ========================================================================== */
import { CREATION } from "./config/creation.js";
/* the class rows, for the one thing a book has to be corrected about on the way in */
import { BASE_CLASSES } from "./data/classes.js";
import { pathOf, extraClassesOf, classesSectionOf, classLevelsStatedOf, levelStatedOf } from "./rules/classes.js";
/* the record's format: a book carries it, and a book without this one is never opened (step 1's move 0) */
import { FORMAT as RECORD_FORMAT, validate as recordFaults } from "./rules/entity.js";
/* the race a record's blood makes (step 1's move 9), from its home beside the rule: state.js imports this file */
import { raceOf } from "./data/heritage.js";
import { nameOf } from "./data/who.js";

const savers = new Map();      // id -> { phase, snapshot, restore }
let book = null;               // { v, name, when, map, world: {}, maps: {} }
/*,,. THE ONES WHO WERE LET GO (Rose, 2026-09-21: "I keep erasing dsd and it keeps
   reappearing", and then "the x clicking said it deleted but it lied") ,,,

   IT DID NOT LIE. The shelf only drops a row when the server has confirmed the
   removal, and the server refuses rather than reports success for a file that is
   not there. The delete really happened, every time.

   WHAT NOBODY TOLD WAS THE RUNNING WORLD. Deleting the file on disc does not
   unload the character: a page still holding her keeps the whole book in memory
   and hands it back through writeHer() at the next mount, rest, level, death,
   spoils or quit -- and /api/sheet/save creates a file that is not there. So the
   delete succeeded and a page left open put her straight back, which reads
   exactly like the button lying.

   IT CANNOT BE FIXED BY REFUSING TO CREATE A MISSING FILE, because a brand new
   character's FIRST write legitimately creates one; app.js:341 exists to do
   precisely that, so that a character made and quit before her first camp is not
   lost. The question is not "is the file there" but "was she let go", and only a
   delete knows that. This is where a delete says so. */
const letGo = new Set();
let mapKey = null;             // the map the runner is on

/** a system's page: `phase` boot | world | map; snapshot() returns plain
    JSON; restore(data) takes it back. Returns the unregister. */
import { sessionFor } from "./owner.js";

export function registerSaver(id, saver) {
    savers.set(id, saver);
    return () => { if (savers.get(id) === saver) savers.delete(id); };
}

/*,,. A BOOK IS A CHARACTER NOW, AND HER WORLD IS INSIDE IT ,,,
   Rose, 2026-09-15, ruling the whole save model: "Continue no longer loads a
   saved game it loads a character and the character loads a map in whatever
   state it is in", and then, asked whether the characters share a world:
   "One per character... each character is its own unique instance of the
   world."

   WHY, AND THE REASON IS NOT TASTE. An LLM seat can play while the game is
   shut, so the world moves without the player in it. A snapshot save would
   then be a LIE -- restoring one rolls back whatever a seat actually did, and
   the player would be undoing another mind's evening. So there is nothing to
   roll back to: the book is not a photograph of a moment, it is the world,
   and Continue walks back into it wherever it has got to. Rose on the
   consequence, given the burned-inn case: "It'll load in a burned down inn
   then."

   THE SHAPE BARELY HAD TO CHANGE, which is the good news and the reason this
   is an edit rather than a rewrite. A book was already one world with a page
   per system and a slot per map. One world per character means one BOOK per
   character, so the only things missing were an identity to file it under and
   a header the character list can read without loading the world behind it.

   `id` is minted once and never changes; the file is named from it, so
   renaming her does not orphan her world. `who` is the cover: enough to draw
   her row on the list and nothing more. */
const newId = () => "c" + Date.now().toString(36)
                  + Math.floor(Math.random() * 1e6).toString(36);

/*,,. WHERE HER BOOKS LIVE (Rose 2026-09-18: "player saves to chars\player") ,,,
   The name was spelled "saves" by hand at five call sites -- three writes, a
   delete, and the static road a book is read back off -- which is four chances
   to move four of them and leave the fifth writing somewhere nobody reads.
   One constant, and the static road is derived from it rather than typed
   again, so the shelf a book is written to is the shelf it is read from by
   construction.
   THE OLD SHELF IS GONE (2026-09-29, step 1's move 0). Books written before the
   move to chars\player sat in saves\, and every one of them predates the
   record's format, so none could be opened anyway (Rose: "Delete all the old
   shapes. We dont any backwards compatibility as its just needless bloat"). */
export const PLAYER_SHELF = "chars/player";
const shelfRoad = (shelf, file) => "/" + shelf + "/" + encodeURIComponent(file)
                                 + "?t=" + Date.now();

/*,,. SIX SLOTS, AND A CHARACTER KNOWS WHICH IS HERS (Rose 2026-09-18) ,,,
   "it needs a limit of 6 slots that can be saved at once. When new game is launched the game asks you which
   slot you want to select 1-6 which will let you overwrite a game or make a new char in an empty slot."
   THE SLOT IS IN THE BOOK, not in an index beside it. The shelf's own header warns why -- "splitting the
   index from the volumes would put the truth in two places" -- and a slot kept anywhere but in the book is a
   number that can disagree with the character standing in it. A book written before tonight has no slot and
   is given the lowest free one when the shelf is first read (listCharacters), stamped back the same way a
   portrait is. */
export const SLOT_MAX = 6;
export const slotsOf = (list) => {
    const taken = new Map();
    /* a character who died for good holds no slot: the Hall keeps them, the six are for the living */
    for (const e of list || []) if (e && !e.dead && e.slot >= 1 && e.slot <= SLOT_MAX) taken.set(e.slot, e);
    return Array.from({ length: SLOT_MAX }, (_, i) => ({ n: i + 1, entry: taken.get(i + 1) || null }));
};

const fresh = () => ({ v: 1, recordFormat: RECORD_FORMAT, id: newId(), who: null, name: null, when: null,
                       map: null, slot: null, world: {}, maps: {} });
/*,,. A CAPPED CLASS IS WRITTEN DOWN AS LEVEL ONE, NOT READ AS ONE (Rose, 2026-09-20) ,,,
   His correction, and it is the second time on this: *"there is no reading as it is... It cannot
   level period - not cosmetically"*.

   data/classes.js makes every rule that asks `classesOf` or `classLevelsOf` see a Savant as one
   class at level one. That was not enough and he was right that it was not. A dozen places read
   `self.level` STRAIGHT -- world/casting.js levelOf() is one, and it is the reason he could still
   reach 2nd-level spells on a level-1 Savant -- and none of them go near those two functions. An
   interpretation layer only covers the readers that know to ask.

   So the RECORD is corrected here, on the one road every book from disc walks. A Savant's book
   holds level 1, one class, no other class levels and no experience, because that is what the
   character is. Nothing downstream needs to know about the cap, and a reader written next month
   inherits the truth without being told. */
const capBooks = (o) => {
    const self = o && o.world && o.world.creation && o.world.creation.self;
    if (!self) return o;
    const named = [pathOf(self)].concat(extraClassesOf(self));
    const cap = named.find((p) => p && BASE_CLASSES[p] && BASE_CLASSES[p].capped);
    if (!cap) return o;
    const at = Math.max(1, Math.floor(BASE_CLASSES[cap].capped));
    /* said out loud, because silently rewriting somebody's save is the kind of thing that should
       never happen without a line in the log saying it did */
    const stated = classLevelsStatedOf(self);
    if (levelStatedOf(self) !== at || (self.deeds && self.deeds.xp) || extraClassesOf(self).length
        || (stated && Object.keys(stated).length > 1))
        console.info("[save] " + (nameOf(self) || "this character") + " is a " + cap
            + ": the book is written back to level " + at + ", one class, no experience.");
    /* the classes section (step 1's moves 12a-b): the capped class and no other, at its one level */
    const sec = classesSectionOf(self) || (self.classes = { path: null, classes: null });
    sec.path = cap;
    sec.classes = [];
    sec.classLevels = { [cap]: at };
    sec.level = at;
    if (self.deeds) self.deeds.xp = 0;
    return o;
};

const normalise = (o) => capBooks({ ...fresh(), ...(o || {}),
    /* a book written before ids existed keeps working and is given one on
       adoption, so the old named saves are characters too rather than a
       migration nobody asked for */
    id: (o && o.id) || newId(),
    slot: (o && o.slot >= 1 && o.slot <= SLOT_MAX) ? o.slot : null,
    world: (o && o.world) || {}, maps: (o && o.maps) || {} });

/** the running book, opened on first use */
export function openBook() { if (!book) book = fresh(); return book; }
/** a new game: nothing remembered, standing in the slot she was given */
export function newBook(slot) {
    book = fresh(); mapKey = null;
    if (slot >= 1 && slot <= SLOT_MAX) book.slot = slot;
    return book;
}
/** a book read from disc becomes the running one */
export function adoptBook(obj) {
    /* the shelf hands over only books of the record's format (readSave); any other reaching here is a bug, said out
       loud rather than opened (step 1's move 0) */
    if (!obj || obj.recordFormat !== RECORD_FORMAT)
        throw new Error("save: a book of another record format was handed to adoptBook; it is never opened");
    book = normalise(obj);
    /* a book read back off the shelf is plainly not let go */
    try { letGo.delete(fileOf(book)); } catch (e) { /* an unnamed book has no file yet */ }
    return book;
}
export const currentBook = () => book;
export const currentMap = () => mapKey;

/*,,. THE RUNNER SAYS WHICH MAP IT STANDS ON -- AND A CHANGE COMMITS THE LAST ONE
   (Rose 2026-09-18: "autosave on map change too") ,,,
   A map's page is kept in the book under its own key and every map she has stood on keeps its page, so the
   book in memory is always whole. What was missing was the moment: leaving a map wrote nothing, so a world
   crossed on foot and then closed without a Quit to Title lost everything since the last rest.
   IT WRITES BEFORE THE KEY MOVES, which is the whole trick: the pages in hand still belong to the map she
   is leaving, and `snapshotWorld("leave")` inside autosave files them under the OLD key. Writing after the
   key changed would file the old map's state under the new map's name.
   A FIRST ENTRY IS NOT A CHANGE. mapKey is null before the first map stands, and an autosave there would
   ask an empty book to write a character nobody has made yet. */
export function enterMap(key) {
    const next = key || null;
    if (mapKey && next && next !== mapKey && hasCharacter()) {
        try { autosave(); } catch (e) { console.warn("[save] leaving " + mapKey + ":", e && e.message); }
    }
    mapKey = next;
    if (book) book.map = mapKey;
}
/** the page kept for a map, or null */
export function mapData(key) { return (book && book.maps[key]) || null; }

const each = (phase, fn) => {
    for (const [id, s] of savers) if (s.phase === phase) {
        try { fn(id, s); } catch (e) { console.warn("[save] " + id + " " + phase + ":", e && e.message); }
    }
};

/** every map-phase page into the current map's slot. `why` is "write" for
    a save going to disc and "leave" for the book's own memory: a page that
    promotes something (the seats' checkpoint) does so only on a write. */
export function snapshotMap(why = "leave") {
    if (!mapKey) return;
    openBook();
    const m = book.maps[mapKey] = book.maps[mapKey] || {};
    each("map", (id, s) => { if (s.snapshot) m[id] = s.snapshot(why); });
}
/*,,. WHAT MUST BE CURRENT BEFORE THE PAGES ARE TAKEN (step 1's move 13a) ,,,
   The boot pages are copied first, and her record is one of them. A world that keeps part of the record live (where
   she stands) files it into the record here, before the copy. Each registration hands back its own unhook. */
const beforeTaking = new Set();
export function beforePages(fn) {
    beforeTaking.add(fn);
    return () => { beforeTaking.delete(fn); };
}
/** every page: boot and world into the book, the map into its slot */
export function snapshotWorld(why = "leave") {
    openBook();
    for (const fn of beforeTaking) {
        try { fn(why); } catch (e) { console.warn("[save] before the pages:", e && e.message); }
    }
    each("boot", (id, s) => { if (s.snapshot) book.world[id] = s.snapshot(why); });
    each("world", (id, s) => { if (s.snapshot) book.world[id] = s.snapshot(why); });
    snapshotMap(why);
    book.when = new Date().toISOString();
    book.map = mapKey;
    return book;
}
export function restoreBoot() {
    if (!book) return;
    each("boot", (id, s) => { if (s.restore && book.world[id] !== undefined) s.restore(book.world[id]); });
}
export function restoreWorld() {
    if (!book) return;
    each("world", (id, s) => { if (s.restore && book.world[id] !== undefined) s.restore(book.world[id]); });
}
export function restoreMap() {
    const m = mapData(mapKey);
    if (!m) return;
    each("map", (id, s) => { if (s.restore && m[id] !== undefined) s.restore(m[id]); });
}

/*,,. THE SHELF: saves/ beside chars/ and myth/, the same door ,,, */
const slug = (name) => (String(name || "save").trim().replace(/[^\w -]/g, "") || "save");
/* FILED UNDER THE ID, NOT THE NAME. A name is hers to change and two
   characters may share one; an id is the world's handle on her. The readable
   part is kept in the filename anyway, because a folder of `c1x9f2.save.json`
   is a folder nobody can help you with when something goes wrong. */
const fileOf = (b) => (b && b.id)
    ? slug(b.who && b.who.name ? b.who.name : "her") + "." + b.id + ".char.json"
    : slug((b && b.name) || "save") + ".save.json";

/** the cover of the book: what the character list draws a row from, without
    reading the world behind it. Only facts something actually writes -- a
    field here that nothing fills is the "zero readers" bug this codebase has
    already recorded twice, pointed the other way. */
function coverOf() {
    const self = (book && book.world && book.world.creation
                  && book.world.creation.self) || null;
    return {
        name: nameOf(self) || "Nameless",
        path: pathOf(self),
        race: raceOf(self),
        align: self ? [self.who.order, self.who.morality].filter(Boolean).join(" ") : null,
        map: mapKey || (book && book.map) || null,
    };
}

/* HER PORTRAIT RIDES THE BOOK (Rose 2026-09-16, of the shelf's plate: "The
   image is actually a HUD of the player"). The world shoots it off the live
   figure (world/portraits.js) and lends this a way to ask; a book written
   with no world standing keeps the last one it had. */
let portraitSrc = null;
export function setPortraitSource(fn) { portraitSrc = typeof fn === "function" ? fn : null; }

/*,,. A PICTURE MUST NEVER COST A SAVE ,,,
   The sheet endpoint refuses a body over its cap and answers 400 (tools/serve.py
   "that is not a sheet"), and both writers here swallow a failed write -- one
   `.catch(() => false)`, one "the server did not answer". So the day a portrait
   grew past the cap, a character would simply stop being written to disc, quietly,
   with a picture as the cause and nothing on screen to say so. Measured 2026-09-19
   while raising the resolution: PNG at 1024 is 1,145 KB as a data URL, over the cap
   BEFORE the record it travels with.
   The answer is not a smaller picture, it is an order of preference: the record is
   what the player cannot lose, the face can be taken again in a frame. If the book
   will not fit, the face comes out and the book goes. */
export const SHEET_MAX = 4_000_000;   // the cap both servers enforce; keep the three in step
export function sheetText(vol) {
    const full = JSON.stringify(vol);
    if (full.length <= SHEET_MAX || !vol || !vol.portrait) return full;
    const { portrait, ...rest } = vol;
    console.warn("[save] the likeness was " + Math.round(portrait.length / 1024)
        + " KB and the book would not fit; written without it");
    return JSON.stringify(rest);
}

/** snapshot everything and write the book under this name */
export async function writeBook(name) {
    snapshotWorld("write");
    /*,,. A RECORD THAT IS NOT WHOLE IS NEVER WRITTEN, AND IT IS SAID (step 1's move 24c; sadia's row check) ,,,
       Her record is checked here, at the one door every save walks through (a rest, a level, a death, a map's change,
       the quit). A record carrying a field outside its sections, or missing one, would open as a stranger's or not at
       all, so nothing is written and the book on disc stays as it was. The refusal is told: an error in the console,
       and a `save:refused` event the world turns into one plain line, with entity.js validate's own reasons in it. */
    const rec = book.world && book.world.creation && book.world.creation.self;
    const faults = rec ? recordFaults(rec) : [];
    if (faults.length) {
        const why = "the character's record is not whole (" + faults.join("; ") + ")";
        console.error("[save] " + why + "; nothing was written");
        try { dispatchEvent(new CustomEvent("save:refused", { detail: { why } })); } catch (e) { /* no window to tell */ }
        return { ok: false, why };
    }
    try { const p = portraitSrc && portraitSrc(); if (p) book.portrait = p; } catch (e) { /* no picture tonight */ }
    /* the cover FIRST: it is read off the creation page that snapshotWorld
       has just handed in, and the book's name falls out of it. `name` is
       still honoured for a caller that wants to title a book by hand, but
       nothing does any more -- her own name is the name. */
    book.who = coverOf();
    book.name = name || book.who.name || book.name || "save";
    const file = fileOf(book);
    /* SHE WAS LET GO, and a write now would raise her (see `letGo` above). The
       refusal is loud in the return and silent on screen: every caller of
       writeHer already swallows a failure, because a write that does not land
       has never been allowed to interrupt the evening. */
    if (letGo.has(file)) return { ok: false, why: "this character was let go; nothing is written" };
    const r = await fetch("/api/sheet/save", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ folder: PLAYER_SHELF, file, text: sheetText(book), session: sessionFor() }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    if (j && j.ok) return { ok: true, where: PLAYER_SHELF.replace("/", "\\") + "\\" + file };
    return { ok: false, why: (j && (j.error || j.why)) || "the server did not answer; nothing was written" };
}
/** a load in progress: the world being left must not write its pages over
    the book just adopted, so the next leave is silent */
let loading = false;
export function beginLoad() { loading = true; }
/** is there a person in this book yet? A book with no creation record is an
    empty world nobody has walked in, and writing one would put a nameless
    character on the Continue list. */
export const hasCharacter = () =>
    !!(book && book.world && book.world.creation && book.world.creation.self);

/** the runner's leave: the book remembers, and a book with somebody in it
    goes to disc.
    ,,. IT USED TO NEED A NAME, AND THAT IS NOW THE WRONG QUESTION ,,,
    The gate was `if (book && book.name)`, where `name` was the word the
    player typed at the old save screen -- so a run was only ever written
    once the player had deliberately saved it under a title. There is no save
    screen any more (Rose 2026-09-15: the world writes itself at rest points
    and "the saving is not yours to do"), so nothing ever types that name and
    every character would have been forgotten the moment the world came down.
    The right question is whether anybody is IN the book. */
export function autosave() {
    if (loading) { loading = false; return; }
    snapshotWorld("leave");
    if (hasCharacter()) writeBook().catch(() => {});
}

/** SHE EXISTS NOW: called when a character is finished, and at every rest
    point after. This is the only way a book reaches disc. */
export function writeHer() {
    /*,,. ASK AFTER LOOKING, NOT BEFORE (Rose, 2026-09-15) ,,,
       "I made a new character and went the void map then I quit... and went
       to continue. I didnt see my character."

       hasCharacter() reads book.world.creation.self, and book.world is filled
       ONLY by snapshotWorld() -- which writeBook() runs. So on a book fresh
       from newBook(), world is {} at this line, the question is asked of an
       empty page, and the first write after creation silently returned
       "nobody in the book". autosave() below already snapshots before it
       asks; this now does the same, so the two agree. */
    snapshotWorld("write");
    if (!hasCharacter()) return Promise.resolve({ ok: false, why: "nobody in the book" });
    return writeBook();
}
/*,,. A DEATH THAT IS FINAL (Rose 2026-09-28: "The permadeath modes should kill your characters when you die") ,,,
   The running book is marked dead and written at once: how, where and when, in what mode, at what level. It gives up
   its slot, it leaves Continue, and the Hall of the Dead reads it (ui/hall.js). Never erased: the Hall is its home. */
export function markDead(detail) {
    if (!book) return Promise.resolve({ ok: false, why: "no book open" });
    book.dead = { ...(detail || {}), at: new Date().toISOString() };
    book.slot = null;
    return writeHer();
}
/** the files on the shelf, newest first by their own stamp once read */
export async function listSaves() {
    const r = await fetch("/api/sheets").catch(() => null);
    const j = r && r.ok ? await r.json().catch(() => null) : null;
    if (!j) return [];
    return Array.isArray(j[PLAYER_SHELF]) ? j[PLAYER_SHELF] : [];
}
/* a book off the shelf, whatever its format; null when the file is not a book at all */
async function readRaw(file) {
    const r = await fetch(shelfRoad(PLAYER_SHELF, file), { cache: "no-store" }).catch(() => null);
    const j = r && r.ok ? await r.json().catch(() => null) : null;
    return (j && j.v && j.world) ? j : null;
}
/*,,. ONLY A BOOK OF THE RECORD'S FORMAT OPENS (2026-09-29, step 1's move 0) ,,,
   Rose: "Delete all the old shapes. We dont any backwards compatibility as its just needless bloat". A book written
   before the record's format holds its character in a shape the game no longer reads, so it is never opened: not by
   Continue, not by the Hall, not by a stamp. The title says why (listRefused, below). */
/* AND A BOOK WHOSE RECORD IS NOT WHOLE OPENS NO MORE THAN AN OLD ONE (step 1's move 24c): its character is not one the
   game can stand, so Continue never takes it up, and listRefused names it for Continue's line */
const recordWhole = (j) => { const s = j && j.world && j.world.creation && j.world.creation.self; return !s || recordFaults(s).length === 0; };
export async function readSave(file) {
    const j = await readRaw(file);
    return (j && j.recordFormat === RECORD_FORMAT && recordWhole(j)) ? j : null;
}
/** the books on the shelf that will not open because they were written before the record's format, and whose they
    were: for the one line Continue shows */
export async function listRefused() {
    const out = [];
    for (const f of await listSaves().catch(() => [])) {
        const j = await readRaw(f).catch(() => null);
        if (j && (j.recordFormat !== RECORD_FORMAT || !recordWhole(j))) out.push({ file: f, name: (j.who && j.who.name) || j.name || f });
    }
    return out;
}

/**
 * EVERY CHARACTER WHO HAS WALKED, newest first: what Continue shows.
 *
 * It reads each book whole, which looks wasteful and is not worth fixing: a
 * book is about 17 KB and a player has a handful of characters, so this is a
 * few hundred kilobytes off local disc once, when the list opens. Splitting
 * the cover into its own index file would be faster and would put the same
 * truth in two places, which is precisely the failure the shelf's own header
 * warns about ("an index from the volumes would put the truth in two places").
 *
 * A file that does not parse, or is not a book, is SKIPPED rather than
 * reported: one corrupt character must not take the list down with it, and
 * the player finding one of six gone is a better evening than finding the
 * Continue row dead with no explanation.
 */
export async function listCharacters() {
    const files = await listSaves().catch(() => []);
    const out = [];
    for (const f of files) {
        const j = await readSave(f).catch(() => null);
        if (!j) continue;
        const self = (j.world && j.world.creation && j.world.creation.self) || null;
        out.push({
            file: f,
            id: j.id || f,
            when: j.when || null,
            map: j.map || null,
            /* the whole book, so the shelf's plate can read what the rules
               say of her without a second trip to disc */
            book: j,
            portrait: j.portrait || null,
            /* the cover if the book carries one, else built from the creation
               page the old way -- every save written before today has a
               `world.creation.self` and no `who`, and they are characters too */
            who: j.who || {
                name: nameOf(self) || j.name || f.replace(/\.[^.]*$/, ""),
                path: pathOf(self),
                race: raceOf(self),
                align: self ? [self.who.order, self.who.morality].filter(Boolean).join(" ") : null,
                map: j.map || null,
            },
            slot: (j.slot >= 1 && j.slot <= SLOT_MAX) ? j.slot : null,
            /* a character who died for good (markDead): the Hall's, never Continue's */
            dead: j.dead || null,
        });
    }
    out.sort((a, b) => String(b.when || "").localeCompare(String(a.when || "")));
    /*,,. AND EVERY CHARACTER WRITTEN BEFORE TONIGHT IS GIVEN A SLOT ,,,
       Six books already stood on this shelf when slots arrived and not one of them knew a slot number. They
       are handed the lowest free one in the order the list is already in (newest first), and it is STAMPED
       back into the book so the number is hers from then on -- the same read-modify-write stampPortrait uses,
       and for the same reason: nothing else in her book is touched.
       A SEVENTH BOOK KEEPS ITS PLACE ON THE LIST AND GETS NO SLOT. The picker only offers six, so it cannot
       be overwritten from there; but it is still a character who walked, and hiding her because the shelf ran
       out of numbers would be the worse of the two wrongs. */
    const free = [];
    for (let n = 1; n <= SLOT_MAX; n++) if (!out.some((e) => e.slot === n && !e.dead)) free.push(n);
    for (const e of out) {
        if (e.slot || e.dead || !free.length) continue;
        e.slot = free.shift();
        stampSlot(e.file, e.slot).catch(() => false);
    }
    return out;
}

/** HER SLOT, WRITTEN INTO HER BOOK. The same narrow read-modify-write as
    stampPortrait: the file on disc is read fresh and given one field, so a
    world a seat has moved since is not rolled back by the stamp. */
export async function stampSlot(file, slot) {
    if (!file || !(slot >= 1 && slot <= SLOT_MAX)) return false;
    const j = await readSave(file).catch(() => null);
    if (!j) return false;
    if (j.slot === slot) return true;
    j.slot = slot;
    const r = await fetch("/api/sheet/save", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ folder: PLAYER_SHELF, file, text: JSON.stringify(j), session: sessionFor() }),
    }).catch(() => null);
    const k = r ? await r.json().catch(() => null) : null;
    return !!(k && k.ok);
}

/** KEEP HER LIKENESS IN HER BOOK (the shelf's plate, 2026-09-16). The
    file on disc is read fresh and written back with only `portrait` added,
    so nothing the world (or a seat) has written since is touched; the
    running book is not involved at all. Fails quietly: the picture on the
    plate does not depend on it, only the next opening does. */
export async function stampPortrait(file, dataUrl) {
    if (!file || !dataUrl) return false;
    const j = await readSave(file).catch(() => null);
    if (!j) return false;
    if (j.portrait === dataUrl) return true;
    j.portrait = dataUrl;
    /* and if the picture is what puts it over, there is nothing to write: this
       call exists ONLY to add a picture, so a book that cannot hold one is left
       exactly as it was rather than rewritten identically */
    if (sheetText(j).length < JSON.stringify(j).length) return false;
    const r = await fetch("/api/sheet/save", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ folder: PLAYER_SHELF, file, text: JSON.stringify(j), session: sessionFor() }),
    }).catch(() => null);
    const k = r ? await r.json().catch(() => null) : null;
    return !!(k && k.ok);
}

/** let her go: the character and the world she walked are both gone. */
export async function deleteCharacter(file) {
    const r = await fetch("/api/sheet/delete", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ folder: PLAYER_SHELF, file }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    /* ONLY ON A CONFIRMED REMOVAL. A failed delete leaves her on the shelf, and
       barring her writes then would quietly stop saving a character the player
       still has. */
    if (j && j.ok) letGo.add(String(file).split("/").pop().split("\\").pop());
    return !!(j && j.ok);
}

/** She is being made or adopted again under the same file: the bar lifts. A new
    character carries a new id and so a new filename, so this is really for a
    book that comes back off the disc -- but the register must never outlive the
    thing it was protecting. */
export function unLetGo(file) {
    if (file) letGo.delete(String(file).split("/").pop().split("\\").pop());
}

/*,,. THE BOOK'S PAGE ON SCREEN: pick a save ,,, */
export function openSaveBook(root, { onPick, onClose } = {}) {
    const S = CREATION.style;
    if (document.querySelector("[data-savebook]")) return;
    const veil = document.createElement("div");
    veil.dataset.savebook = "1";
    veil.style.cssText =
        "position:fixed;inset:0;z-index:990;display:flex;align-items:center;" +
        "justify-content:center;background:rgba(4,3,8,0.86)";
    const box = document.createElement("div");
    box.style.cssText =
        `width:min(560px,84%);border:1px solid ${S.panelEdge};border-radius:3px;` +
        "background:linear-gradient(180deg, rgba(26,10,16,0.97) 0%, rgba(8,5,10,0.97) 100%);" +
        `padding:22px 24px;font-family:${S.fontFamily};color:${S.ink}`;
    const h = document.createElement("div");
    h.textContent = "The Save Book";
    h.style.cssText = `color:${S.title};font-family:${S.displayFont};font-size:1.3em`;
    const sub = document.createElement("div");
    sub.textContent = "Every book on the shelf: who, where they stood, and when it was written.";
    sub.style.cssText = `color:${S.inkDim};font-style:italic;font-size:.82em;margin:6px 0 14px;line-height:1.6`;
    const list = document.createElement("div");
    list.style.cssText =
        `max-height:300px;overflow-y:auto;border:1px solid ${S.panelEdge};` +
        "border-radius:2px;background:rgba(8,5,10,0.9);padding:6px";
    const msg = document.createElement("div");
    msg.style.cssText = `min-height:1.4em;font-size:.8em;margin:8px 0 0;color:${S.accent}`;
    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:10px;justify-content:flex-end;margin-top:14px";
    const closeBtn = document.createElement("div");
    closeBtn.textContent = "Close";
    closeBtn.style.cssText =
        `cursor:pointer;padding:6px 16px;border:1px solid ${S.panelEdge};border-radius:2px;` +
        `color:${S.value};font-family:${S.displayFont};letter-spacing:.14em;text-transform:uppercase;font-size:.8em`;
    const close = () => {
        removeEventListener("keydown", onKey, true);
        veil.remove();
        if (onClose) onClose();
    };
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
    addEventListener("keydown", onKey, true);
    closeBtn.onclick = close;
    row.append(closeBtn);
    box.append(h, sub, list, msg, row);
    veil.append(box);
    root.append(veil);

    const line = (text, dim) => {
        const d = document.createElement("div");
        d.textContent = text;
        d.style.cssText = `padding:8px 10px;color:${dim ? S.inkDim : S.ink};font-style:${dim ? "italic" : "normal"}`;
        return d;
    };
    list.append(line("Reading the shelf…", true));
    listSaves().then(async (files) => {
        list.innerHTML = "";
        if (!files.length) { list.append(line("No book on the shelf yet. Save from the rest menu in the world.", true)); return; }
        const entries = [];
        for (const f of files) {
            const j = await readSave(f);
            if (j) entries.push({ f, j });
        }
        entries.sort((a, b) => String(b.j.when || "").localeCompare(String(a.j.when || "")));
        if (!entries.length) { list.append(line("The shelf holds nothing this game can read.", true)); return; }
        for (const { f, j } of entries) {
            const r = document.createElement("div");
            r.style.cssText =
                `display:flex;justify-content:space-between;gap:14px;padding:8px 10px;cursor:pointer;` +
                `border-bottom:1px solid ${S.rule}`;
            const who = nameOf(j.world && j.world.creation && j.world.creation.self) || j.name || f;
            const when = j.when ? new Date(j.when).toLocaleString() : "";
            const left = document.createElement("span");
            left.textContent = who + (j.map ? "  ·  " + j.map : "");
            left.style.cssText = `color:${S.value}`;
            const right = document.createElement("span");
            right.textContent = when;
            right.style.cssText = `color:${S.inkFaint};font-size:.85em`;
            r.append(left, right);
            r.onmouseenter = () => { r.style.background = "rgba(150,120,235,.10)"; };
            r.onmouseleave = () => { r.style.background = ""; };
            r.onclick = () => { close(); if (onPick) onPick(j, f); };
            list.append(r);
        }
    });
}
