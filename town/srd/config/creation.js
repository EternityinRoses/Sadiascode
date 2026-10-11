/**
 * CHARACTER CREATION CONFIG
 *
 * Every knob the creation wizard reads. Steps are declared here, in order;
 * the wizard renders the frame and asks each step to fill the two panes.
 */

export const CREATION = {

    /* ------------------------------------------------------------------ art */
    backdrop: "assets/img/ui/creation_backdrop.webp",

    /* ---------------------------------------------------------------- audio */
    audio: {
        /* TWO TRACKS, ALTERNATING (Rose, 08-09). `playMusic` takes a SET as
           readily as one track: it plays them in declared order and loops the
           pair, so the walk moves between being chosen and being abandoned
           rather than sitting on one mood for fourteen pages. Order is the
           order they play, chosen first.
           Neither is faded between; each runs to its own end, which is the
           point of alternating rather than crossfading. */
        bgm: [
            "assets/audio/bgm/Chosen by Moonlight.ogg",
            "assets/audio/bgm/Abandoned by Moonlight.ogg",
        ],
        bgmFadeInMs: 1000,
        bgmVolume: 0.7,
        se: {
            move:    "assets/audio/se/Cursor1.ogg",     // highlight changed
            select:  "assets/audio/se/Select.ogg",      // a choice was made
            page:    "assets/audio/se/CursorPage.ogg",  // moved forward a step
            back:    "assets/audio/se/PageReturn.ogg",  // moved back a step
            unable:  "assets/audio/se/Unable.ogg",      // a gate refused
            confirm: "assets/audio/se/Decision2.ogg",   // "It is done"
        },
        seVolume: 0.9,
    },

    /* ---------------------------------------------------------------- steps */
    /**
     * Order is the walk, and it is NOT arbitrary, several of these depend on
     * answers from earlier ones, which is why the wizard refuses to let the
     * player jump around:
     *   - race is derived from the two blood parents, so Blood & Hearth is first
     *     and skin palettes, horns, languages and inherited modifiers all hang
     *     off it;
     *   - Difficulty shares a page with ability scores because difficulty IS
     *     the point budget;
     *   - Class shares a page with Gear as "your starting path";
     *   - Verify must be last: it reads every answer back.
     *
     * `built: false` means the frame will draw the step but say it is unwritten.
     * They get filled one at a time.
     */
    steps: [
        /* The trail names the PAGE ("Parents"); "Blood & Hearth" is what the
           right-hand pane is called, and the step titles it itself. */
        { id: "blood",     name: "Parents",        numeral: "I",     built: true },
        { id: "identity",  name: "Identity",       numeral: "II",    built: true },
        { id: "appearance", name: "Appearance",    numeral: "III",   built: true },
        /* ADORNMENT SPLIT OUT OF APPEARANCE (Rose, 2026-08-25: "why is the
           tattoo and accessories on the same page? Should you move on to a
           new page and have 17 pages instead of 16?"). Appearance answers
           what a body IS; this answers what was done to it afterwards, and
           the ink alone is ninety-one designs across eight places. Skills
           came out of Feats the same way on 08-16. Both pages share ONE
           editor in mirror.js and ask it for their half. */
        { id: "adornment", name: "Adornment",     numeral: "IV",    built: true },
        /* HERITAGE IS GONE, FOLDED INTO THIS ONE. The original's page IV was
           named "Heritage" and asked nothing of the sort: a dead column of seven
           `n/a` face dropdowns that never had art behind them, beside a
           biography box. Its live descendants, brows, eyeliner, lips, are the
           makeup rows on Appearance now, so all that was left was one text box,
           and a page for one text box is not a page. The heritage READOUT was
           never here anyway; it is pinned under the column on every page. */
        { id: "alignment", name: "Alignment",      numeral: "V",     built: true },
        { id: "traits",    name: "Traits & Flaws", numeral: "VI",    built: true },
        { id: "stats",     name: "Stats",          numeral: "VII",   built: true },
        /* The Voice sits between the dice and the hiring (Rose 08-17:
           "After stats and before AI Minds put a voice identification /
           profile selection page") -- the seats should know whose word
           is the player's before they are seated. */
        { id: "voice",     name: "The Voice",      numeral: "VIII",  built: true },
        { id: "minds",     name: "AI Minds",       numeral: "IX",    built: true },
        { id: "lineage",   name: "Lineage",        numeral: "X",     built: true },
        { id: "gear",      name: "Class",          numeral: "XI",    built: true },
        { id: "feats",     name: "Feats",          numeral: "XII",   built: true },
        /* Skills split out of Feats on Rose's call (08-16: "move skills
           to another page") */
        { id: "skills",    name: "Skills",         numeral: "XIII",  built: true },
        /*,,. THE CASTER'S TWO PAGES, AND THEN THE SHOP (Rose 2026-09-19) ,,,
           *"Move spells -before- the shop in the char creation. And before
           spells... familiar selection."* The order earns itself now: the
           familiar is the first thing the book hands a caster, before she has
           chosen a word; the Verse is chosen next; and the shop stays LAST
           before the road, which is the thing its own note below asks for --
           it is the stop where you spend what is left, so everything that
           might want the purse has to have happened already. */
        { id: "familiar",  name: "Familiar",       numeral: "XIV",   built: true },
        /*,,. THE KNEE BEFORE THE PURSE (Rose 2026-09-28: "I picked a god / religion with the glaive mastery as that
           gave me proficiency and it didnt give me proficiency") ,,,
           A god trains the hands in its weapon (data/proficiency.js), and the Provisions page marks every weapon the
           hands were not trained to with the SRD's -4. With Faith after the shop, the glaive was sold to Mourne's
           faithful as "not proficient", because nobody had knelt yet when the shelf was read, and nothing after the
           kneeling said otherwise. The god is chosen first now, so the shelf already knows it. */
        /*,,. AND THE KNEE BEFORE THE VERSE (Rose 2026-10-08, a cleric left with no words and no spells: "Oh... I see
           whats going on. Move the spell page after the faith / gods page.") ,,,
           A cleric's words come down from the god (steps/spells.js pageDoor, data/faith.js unanswered), so the Spells
           page is asked after the god is chosen, as a seat's forge already asks it (forge.js: Faith, then Words, then
           Spellbook). data/faith.js dropUnlentWords stays as the net for a god changed by walking back. */
        { id: "faith",     name: "Faith",          numeral: "XV",    built: true },
        { id: "spells",    name: "Spells",         numeral: "XVI",   built: true },
        /* THE LAST STOP BEFORE THE ROAD (Rose, 2026-09-02: "a
           pre-adventure shop that allows the player to buy stuff for the
           adventure - put it after the skills and feats page"). It spends
           the same purse the wardrobe does; heritage() sums both. */
        { id: "shop",      name: "Provisions",     numeral: "XVII",  built: true },
        { id: "name",      name: "Name",           numeral: "XVIII", built: true },
        /* THE BAR IS ARRANGED BEFORE THE ROAD (Rose 2026-09-17: "You may have to add a hotkey addition page
           to the character creation so the player can customize the bar"). Last before the review, because
           what goes on it depends on everything chosen up to here: the class, the blood, the feats. */
        /*,,. A PAGE OF ITS OWN FOR THE SPELL NUMBERS (Rose 2026-09-28: "where is the unique assign spell hotkey page?
           Look at level up to see what I mean") ,,,
           The Spell Hold's and the Word Hold's numbers (data/holds.js) had been put at the foot of the bars' page; the
           level-up screen gives each thing its own page, and so does this walk now, just before the bars, so the bars
           stay last before the review. */
        { id: "spellkeys", name: "Spell Hotkeys",  numeral: "XIX",   built: true },
        { id: "hotkeys",   name: "Hotkeys",        numeral: "XX",    built: true },
        { id: "verify",    name: "Verify",         numeral: "XXI",   built: true },
    ],

    /* --------------------------------------------------------------- layout */
    /**
     * One fixed frame for the whole walk: a scrolling choice column on the left,
     * a framed viewing pane on the right, a thin bar top and bottom. Measured
     * against this reference and scaled, like the title screen.
     */
    layout: {
        referenceWidth: 1920,
        referenceHeight: 1080,
        /* The original gives its panes 92% of the height and 98% of the width,
           the step trail, page title and subtitle live INSIDE the left pane, and
           the only things outside are two key hints and the running line. Keep
           chrome cheap. */
        pad: 16,
        tickerHeight: 22,
        gap: 14,
        /** Fraction of the working width given to the choice column.
         *  Measured off the original: the choice column runs ~60% of the
         *  viewport, not half. */
        columnSplit: 0.60,
    },

    /* ---------------------------------------------------------------- style */
    /**
     * MEASURED from the original running in Chrome, not invented. Four roles,
     * and the roles are the design, colour says what a thing IS:
     *   crimson  structure: section headings, the eyebrow above a name
     *   rose     page titles, and the edge of a button
     *   amber    DERIVED VALUES, the race the blood produced, a household count
     *   grey     prose, in Georgia
     *
     * TWO TYPE VOICES, not one. The original asks for a display face that does
     * not load, but its fallback resolves to **Constantia**, a high-contrast
     * calligraphic system serif, NOT to Georgia. Measured: the same 40px string
     * is 341.9px in Constantia and 353.9px in Georgia. So headings, names, pane
     * titles and buttons speak in Constantia; prose speaks in Georgia. Collapsing
     * both to Georgia (my first reading) throws away half the identity.
     */
    style: {
        /* Cormorant (OFL) fronts both voices, the 08-06 tryout was judged
           with every element overridden, so prose and display share it. The
           old Constantia/Georgia split waits in the fallbacks. */
        fontFamily: '"Cormorant", "Georgia", "Times New Roman", serif',
        displayFont: '"Cormorant", "Constantia", "Palatino Linotype", "Book Antiqua", Georgia, serif',
        /* Cormorant's 400 weight is thin against the void, one step heavier
           keeps small text legible. fontScale is NEUTRAL since the v1
           homework copy (the sizes above are absolute, as v1 renders them);
           it remains as the future one-knob if a face swap ever needs it. */
        fontScale: 1,
        fontWeight: 500,
        bg: "#07060c",
        ink: "#c9c9c9",
        inkDim: "#969696",
        inkFaint: "#6f6f6f",
        accent: "#e33a53",          // crimson, structure
        title: "#964b4b",           // rose, page titles
        value: "#ff9600",           // amber, anything derived
        rule: "rgba(227,58,83,0.22)",
        panel: "rgba(10,8,14,0.72)",
        panelEdge: "rgba(150,75,75,0.34)",
        shadow: "0 2px 12px rgba(0,0,0,0.9)",
        transitionMs: 190,

        /* The progress ruler is the ONE violet thing on a crimson page, 15
           dashes, not dots. A dot says "a step exists"; a dash has length, so
           the row reads as ground already covered and ground still to cross.
           14x3px, 2px radius, 4px gap.

           THREE states, not two. Ground already crossed is a DIMMER violet than
           the step you are standing on, I previously lit both the same and
           wrote "two states, not three, measured" beside it, which was a claim
           I never actually checked. Collapsing past into present costs the row
           its "you are here": with every dash behind you lit identically, the
           glow is the only thing left saying which one is current. */
        rulerPast: "#402c70",
        rulerOn: "rgb(89, 64, 155)",
        rulerAhead: "rgba(36, 36, 84, 0.85)",
        rulerGlow: "rgba(167, 132, 236, 0.6) 0 0 8px",
        rulerDash: [14, 3],
        rulerGap: 4,

        /* The step trail is violet like the ruler, not crimson, it labels the
           ruler it sits above. The "2 of 15" counter behind it is dimmer still,
           in the same violet as ground already crossed. */
        trail: "#59409b",
        trailCounter: "#402c70",

        fieldLabel: "#e33a53",
        controlBg: "rgba(3,2,6,0.72)",
        controlEdge: "rgba(150,75,75,0.30)",
        controlInk: "#969696",
        controlInkOn: "#ffffff",

        /* A BUTTON IS NOT A DROPDOWN. It carries its own dark red gradient and
           lights amber with a red bloom behind it, the one warm thing on the
           page, because it is the only control that DOES something rather than
           recording an answer. Measured off the original. */
        buttonTop: "rgba(40,12,16,0.85)",
        buttonBottom: "rgba(12,5,8,0.9)",
        buttonGlow: "0 0 12px rgba(100,20,20,0.45)",
    },

    /**
     * FIELD GRAMMAR: the one shape every page's questions are built from.
     *
     * A crimson label on its own line at the column's LEFT EDGE, and the control
     * CENTRED in the column beneath it. The label never sits beside its control;
     * there is no label gutter. This is the whole grammar, and it does not vary
     * by page, which is exactly why it belongs here and not written out again
     * in each step. Hand-copying it per row is how a page ends up with the
     * page-title colour on its labels and a fourth alignment nobody chose.
     *
     * Every number below was READ OFF THE ORIGINAL RENDERING with
     * getComputedStyle, not estimated from a screenshot: heading 12px/.24em with
     * a 1px rule, label 15px/.02em, control 180px wide and dead-centre, 16px on
     * rgba(3,2,6,.72). Vertical rhythm, measured the same way: 10px from a label
     * to its control, 16px from a control to the next label, 22px from a control
     * to the next heading.
     *
     * Stored in PIXELS against `base`, the column's own font size, because the
     * original is absolute-px and this frame scales. `src/ui/fields.js` does the
     * division in one place so the measured numbers stay readable as measured
     * numbers.
     */
    /* V1'S HOMEWORK, COPIED (Rose, 08-06: "copy v1's homework - the size
       from each page"). These are v1's css/style.css cc-* numbers verbatim:
       .cc-group 12px/.22em, .row .lbl 14px, .cycler .val 15px, .btn
       17px/10x26 pad, .cc-page-title 22px, .cc-page-sub 13px (the titles
       and subs are set in the steps as ems of base: 22/17.5 = 1.257em,
       13/17.5 = .743em). The derived Cormorant compensations (fontScale
       1.15, smallBoost 1.25) are RETIRED, v1 renders these absolute px
       and that is the readability Rose keeps ruling back to. The one
       survivor is the font FLOOR in creation.js: words never render below
       these numbers when the window squeezes the frame. */
    field: {
        base: 17.5,
        groupPx: 12,  groupTrackEm: 0.22,  groupPadBottomPx: 3,  groupMarginPx: [12, 4],
        labelPx: 14,  labelTrackEm: 0.02,  labelMarginPx: 2,
        controlPx: 15, controlWidthPx: 180, controlPadPx: [5, 10],
        rowPadPx: [6, 10], rowGapPx: 8,
        buttonPx: 17, buttonPadPx: [10, 26], buttonTrackEm: 0.08, buttonTopPx: 12,
        /* the frame's own Back/Next pair sit SMALLER than v1's .btn. Rose's
           deviation from the homework (08-06, twice): nav is chrome, not
           content. Content buttons (EDIT, pushButton rows) keep buttonPx. */
        navPx: 14, navPadPx: [6, 18],
        smallCutPx: 17,
        smallBoost: 1, // retired knob, v1's absolute numbers rule
    },

    /** Words the frame itself says. */
    text: {
        next: "Next",
        back: "Back",
        finish: "It is done",
        counter: (i, n) => `${i} of ${n}`,
        unwritten: "This page is not written yet.",
    },
};

export default CREATION;
