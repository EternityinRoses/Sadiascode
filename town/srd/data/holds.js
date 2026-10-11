/*,,. THE NUMBERS UNDER THE TWO HOLDS (Rose 2026-09-28) ,,,
   "it didnt allow me to assign my spells (or verse words for wizards) to a hotkey number (which is different from
   hotkey bar) instead it moved my spell to the hotkey bar menu... which it shouldnt be really".

   Two rows of numbers that are not the bar (keys.js):
     the SPELL HOLD (castHold, Alt unless rebound): a body that casts by blood (a Sorcerer, a Bard) holds it, and a
       digit 1-8 fires the spell on that number (world/casting.js fireKey)
     the WORD HOLD (spellHold, Shift unless rebound): a body that speaks the words (a Wizard, a Cleric...) holds it,
       and the digits 1-9 are her words, spoken into the line one at a time (world/casting.js keydown)

   What sits on each number is the RECORD's (its mind section's `spellKeys` and `wordKeys`, since step 1's move 15),
   chosen on the creation's Hotkeys page and in the menu's Hotkeys tab, so it goes where the character goes, the way
   the bar does. This file is the one rule the two screens, the Words tab's bind, the level-up page and the casting
   line all share: putting a thing on a number, and laying the day's words out on the digits. It imports nothing, so
   anything may import it. */

/** the Spell Hold's numbers: eight, because the bar already teaches the hand that 1-8 is a row of things */
export const SPELL_DIGITS = 8;
/** the Word Hold's: nine, keys.js word1..word9 */
export const WORD_DIGITS = 9;

/** a row of `n` numbers out of whatever the record holds; a short or missing row reads as empty numbers */
export const digitsOf = (list, n) => Array.from({ length: n }, (_, i) => (Array.isArray(list) && list[i]) || null);

/** the first empty number, or -1 */
export const freeDigit = (list, n) => digitsOf(list, n).indexOf(null);

/**
 * PUT `id` ON NUMBER `seat` (0-based) of a row of `n`. It moves, it never doubles: the number it sat on is left, and
 * whatever it displaces goes to that number, a swap (Rose 2026-09-26: "if I choose alt+1 and alt+3 and I move one spell
 * to alt 3 the other swaps to alt+1 instead of clears"); a thing that sat on no number sends what it displaces to the
 * first empty one, and only when every number is full does that thing lose its number. A null `id` empties the number.
 * @returns {{ list: Array, lost: string|null }} the new row, and whatever lost its number
 */
export function seatOnDigit(list, seat, id, n) {
    const row = digitsOf(list, n);
    if (!(seat >= 0 && seat < n)) return { list: row, lost: null };
    if (!id) { row[seat] = null; return { list: row, lost: null }; }
    const was = row.indexOf(id);
    const displaced = row[seat] && row[seat] !== id ? row[seat] : null;
    if (was >= 0) row[was] = null;
    row[seat] = id;
    let lost = null;
    if (displaced) {
        const home = was >= 0 ? was : row.indexOf(null);
        if (home >= 0) row[home] = displaced; else lost = displaced;
    }
    return { list: row, lost };
}

/**
 * THE DAY'S WORDS ON THE DIGITS. A word she has laid on a number is spoken by that number whenever today's hand holds
 * it; every other word of the hand fills the numbers left over, in the hand's own order, so a laid-out word the day did
 * not hand her gives its number to the next of them and no word of the hand is ever left without one while there is
 * room. With nothing laid out this is the hand exactly as the digits always spoke it.
 * @returns {Array} `n` entries, a word id or null
 */
export function arrangeWords(hand, layout, n) {
    const h = (Array.isArray(hand) ? hand : []).filter(Boolean);
    const lay = digitsOf(layout, n);
    const out = new Array(n).fill(null);
    for (let i = 0; i < n; i++) if (lay[i] && h.includes(lay[i]) && !out.includes(lay[i])) out[i] = lay[i];
    let j = 0;
    for (const w of h) {
        if (out.includes(w)) continue;
        while (j < n && out[j]) j++;
        if (j >= n) break;
        out[j++] = w;
    }
    return out;
}
