/**
 * VOICES: the recorded audition lines, indexed by what the player picks.
 *
 * Female and Male are a 3x3: three RANGES by three TIMBRES. Andro is not, it
 * has two flavours and no range or timbre at all, so the picker must change
 * shape rather than offer rows that resolve to nothing.
 *
 * Each pick has three takes: one "Avari" line and two monologues. The audition
 * plays one; "Hear your voice" cycles them, so repeated presses are not the same
 * clip over and over.
 */

const ROOT = "assets/audio/voice";

/**
 * THE GAME NEVER SAYS "male" OR "female" TO A PLAYER. Rose, 2026-07-31: *"I never
 * say male or female in the game because it allows any path the player wants. If
 * the player wants non-binary, trans, etc."*
 *
 * So the words on screen are **Feminine / Masculine / Androgynous**, describing
 * the voice, not the person. `Female` / `Male` / `Andro` survive only as the
 * folder names the recordings already live under, and must never reach the UI.
 *
 * The record calls this `kind` rather than `gender` for the same reason: a field
 * named `gender` holding "Female" is one careless template away from printing
 * itself, and it says the wrong thing about what is being chosen.
 */
export const VOICE_KINDS = [
    { label: "Feminine",    key: "Female" },
    { label: "Masculine",   key: "Male" },
    { label: "Androgynous", key: "Andro" },
];
export const kindLabel = (key) => (VOICE_KINDS.find(k => k.key === key) || {}).label || key;
export const kindKey = (label) => (VOICE_KINDS.find(k => k.label === label) || {}).key || label;

/** Mid first, and Mid is the default, the middle of a range is where you start. */
export const VOICE_RANGES = ["Mid", "High", "Low"];

/**
 * The third timbre is called **Stray** on screen. `Calm` is the folder it was
 * recorded into and nothing more, the same rule as Female/Male/Andro above, and
 * the reason this list carries a label beside its key instead of being three
 * bare strings that get printed straight out of the directory listing.
 */
export const VOICE_TIMBRES = [
    { label: "Heroic", key: "Heroic" },
    { label: "Noble",  key: "Noble"  },
    { label: "Stray",  key: "Calm"   },
];
export const timbreLabel = (key) => (VOICE_TIMBRES.find(t => t.key === key) || {}).label || key;
export const timbreKey = (label) => (VOICE_TIMBRES.find(t => t.label === label) || {}).key || label;

/** Andro carries no Feminine recordings, offering one would be a dead choice. */
export const ANDRO_FLAVOURS = ["Genderless", "Masculine"];

/** Whose voice each pick actually is, worth surfacing, these are real people. */
const PERFORMER = {
    "Female|High|Calm": "Hannah",   "Female|High|Heroic": "Scarlet",  "Female|High|Noble": "Sam",
    "Female|Mid|Calm":  "Azziza",   "Female|Mid|Heroic":  "Delbellz", "Female|Mid|Noble":  "FruitV",
    "Female|Low|Calm":  "Nikki",    "Female|Low|Heroic":  "Shirin",   "Female|Low|Noble":  "Frenchies",
    "Male|High|Calm":   "Troy",     "Male|High|Heroic":   "David",    "Male|High|Noble":   "Hayden",
    "Male|Mid|Calm":    "Asesino",  "Male|Mid|Heroic":    "Chris",    "Male|Mid|Noble":    "Nate",
    "Male|Low|Calm":    "Nate",     "Male|Low|Heroic":    "Shaun",    "Male|Low|Noble":    "Shaun",
    "Andro|Genderless": "Fwoof",    "Andro|Masculine":    "Ev",
};

/** Internal: the filenames follow the performer, so only `takesFor` needs this. */
function performerFor(v) {
    return PERFORMER[v.kind === "Andro" ? `Andro|${v.flavour}` : `${v.kind}|${v.range}|${v.timbre}`] || null;
}

/**
 * The three takes for a pick, in the order the audition cycles them.
 * Filenames follow the folder, not the label, e.g. the "Noble" timbre files are
 * all named `Noble…`, so a picker label that drifts from the folder name silently
 * plays the wrong performer.
 */
export function takesFor(v) {
    const who = performerFor(v);
    if (!who) return [];
    if (v.kind === "Andro") {
        const tag = v.flavour === "Genderless" ? "Andro" : "Masc";
        return [
            `${ROOT}/Andro/${v.flavour}/${tag}Avari${who}.ogg`,
            `${ROOT}/Andro/${v.flavour}/${tag}Monologue${who}1.ogg`,
            `${ROOT}/Andro/${v.flavour}/${tag}Monologue${who}2.ogg`,
        ];
    }
    const dir = `${ROOT}/${v.kind}/${v.range}/${v.timbre}`;
    return [
        `${dir}/${v.timbre}Avari${who}.ogg`,
        `${dir}/${v.timbre}Monologue${who}1.ogg`,
        `${dir}/${v.timbre}Monologue${who}2.ogg`,
    ];
}

/**
 * The voice a new character starts with. Lives HERE, beside the lists it has to
 * agree with, a second copy written out in the record drifts the moment a
 * default changes, and this one already did: the timbre default moved and only
 * one of the two copies followed.
 */
export const DEFAULT_VOICE = {
    kind: "Female", range: "Mid", timbre: "Heroic",
    flavour: "Genderless",
    pitchPct: 100,
};

/**
 * PITCH IS 90–110 PERCENT AND NO WIDER. Rose, 2026-07-20: *"anything else
 * sounds weird"*, and widening it has already been tried once and reverted.
 *
 * The mechanism is playbackRate, which is tape speed: it drags the formants
 * along with the pitch, so past about ten percent the performance smears into
 * a chipmunk or a drunk rather than sounding like a higher or lower voice. A
 * whole number of percent, because that is what the player is choosing, a
 * two-decimal multiplier tells them less and reads as an internal knob.
 */
export const PITCH_MIN = 90, PITCH_MAX = 110, PITCH_DEFAULT = 100;
export const playbackRate = (pct) => (pct || PITCH_DEFAULT) / 100;
