/* ============================================================================
   THEIR OWN PRONOUNS.

   Rose, 2026-09-16: "why do you call all of the player characters 'her' when
   the pronoun section exist? It can be her, him, or them."

   The identity page writes self.who.pronouns = { subjective, objective,
   possessive } (She/Her/Her, He/Him/His, They/Them/Their, or any mix of its
   three dropdowns, which is a real person and is spoken as chosen). Every
   sentence the game says OF the player reads them from here; a record that
   never said gets they/them/their. The comments across the game keep the old
   habit of "her"; the words on the screen do not.

   HOW A SENTENCE IS WRITTEN. pron("{S} {has} lit a torch") is "She has lit a
   torch" for one record and "They have lit a torch" for another. The tokens:
     {s} {o} {p}   the subjective, objective and possessive: she / her / her
     {S} {O} {P}   the same, capitalised for a sentence's start
     {own}         the possessive that stands alone: hers / his / theirs
     {self}        the reflexive: herself / himself / themself
     {watches}     any other token is a verb in its third-person singular
                   form, and is conjugated to agree: watches / watch,
                   has / have, is / are, was / were, does / do. Written with
                   a capital ({Has}) it keeps it.
   Text with no tokens passes through untouched, so a sentence may be filled
   twice without harm, and a data table (feat notes, the hotkey bar's help,
   the herald's lines) can carry tokens and be filled where it is shown.
   ========================================================================== */

import { state } from "./state.js";

const FALLBACK = { subjective: "They", objective: "Them", possessive: "Their" };
const IRREGULAR = { has: "have", is: "are", was: "were", does: "do", goes: "go" };

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** the plural (bare) form of a third-person singular verb: watches -> watch */
export function plural(verb) {
    const v = String(verb);
    const low = v.toLowerCase();
    if (IRREGULAR[low]) return IRREGULAR[low];
    if (/(ches|shes|sses|xes|zzes|oes)$/.test(low)) return v.slice(0, -2);
    if (/[^aeiou]ies$/.test(low)) return v.length > 4 ? v.slice(0, -3) + "y" : v.slice(0, -1);
    if (/[^s]s$/.test(low)) return v.slice(0, -1);
    return v;
}

/**
 * The set for one record's pronouns ({ subjective, objective, possessive },
 * identity.js's shape; null for they/them/their): every word lowercased,
 * the capitalised forms, the verbs that agree, v(verb) to conjugate one, and
 * fill(text) to write a sentence with the tokens above.
 */
export function pronounSet(p) {
    const q = p || {};
    const low = (v, d) => String(v || d).toLowerCase();
    const subjective = low(q.subjective, FALLBACK.subjective);
    const objective = low(q.objective, FALLBACK.objective);
    const possessive = low(q.possessive, FALLBACK.possessive);
    const they = subjective === "they";
    const v = (verb) => {
        const out = they ? plural(verb) : String(verb);
        return /^[A-Z]/.test(String(verb)) ? cap(out) : out;
    };
    const set = {
        subjective, objective, possessive,
        Subjective: cap(subjective), Objective: cap(objective), Possessive: cap(possessive),
        own: /s$/.test(possessive) ? possessive : possessive + "s",
        reflexive: objective === "them" ? "themself" : objective + "self",
        plural: they,
        has: they ? "have" : "has", is: they ? "are" : "is",
        was: they ? "were" : "was", does: they ? "do" : "does",
        v,
        fill: (text) => String(text).replace(/\{([A-Za-z]+)\}/g, (m, k) => {
            switch (k) {
                case "s": return subjective;
                case "o": return objective;
                case "p": return possessive;
                case "S": return set.Subjective;
                case "O": return set.Objective;
                case "P": return set.Possessive;
                case "own": return set.own;
                case "Own": return cap(set.own);
                case "self": return set.reflexive;
                case "Self": return cap(set.reflexive);
                default: return v(k);
            }
        }),
    };
    return set;
}

/** the set for a record's pronouns (its who section, step 1's move 9), or, with none given, the player's
    own off the live creation record */
export function pronouns(who) {
    const rec = who || (state.creation && state.creation.self) || null;
    return pronounSet(rec && rec.who && rec.who.pronouns);
}

/** a sentence in the player's own pronouns: pron("{S} {has} {p} words.") */
export function pron(text, who) { return pronouns(who).fill(text); }
