/* ============================================================================
   WHAT A RECORD IS CALLED: ONE READER (step 1's move 23, 2026-10-01; sadia's ask: one door, as pathOf and deityOf are
   for the class and the god).

   Her record, a seat's forged sheet and a world body's mind each keep what it is called in their who section
   (entity.js; step 1's move 23), and every reader asks here, so no reader knows where a name is kept.

   THE OTHER SHAPES keep a flat `name` of their own and are answered by it: a fighter (the fight's own copy, built from
   the record when a fight opens: battle/roster.js fighterOf), a view made for one question, and a seat's chair before
   its prime (its config record is its mind, and has no who until the forge's is copied in: world/void.js
   primeSeatMind).

   THE SAME-NAME TRAP: a book's and a seat file's COVER is also called `who` (save.js and seatChars.js coverOf). It is
   not a record, and keeps its own readers.
   Written by Vera.
   ========================================================================== */

/** what a record is called: its who section's `name`, else (no who section: a fighter, a view, a seat's chair before
    its prime) its own `name`; null when none */
export const nameOf = (x) => {
    if (!x) return null;
    const w = x.who;
    const sec = w && typeof w === "object" && !Array.isArray(w) ? w : null;
    return (sec && sec.name) || x.name || null;
};
