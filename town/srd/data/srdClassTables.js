/* ============================================================================
   THE SRD'S CLASS TABLES, VERBATIM (Rose 2026-09-28: "I can bet money the level up doesnt use any of the srd tables",
   "if you looked at the srd pages for the classes you would have seen it").

   Every class's table as d20srd.org prints it (Open Game Content under the OGL v1.0a, licenses/OGL-SRD-3.5.txt): for
   each level its base attack bonus, its three saves, its Special column split into its features, and the columns
   after (spells per day; a bard's spells known; a monk's flurry, unarmed damage, AC and speed), as printed. GENERATED
   2026-09-28T04:11 from the pages named in each class's `url`, read first in Chrome; never edited by hand. Nothing here is a
   rule: data/levelling.js computes, and tests/test_srdTables.mjs holds its numbers to these rows.
   ========================================================================== */

export const SRD_CLASS_TABLES = {
 "Barbarian": {
  "url": "https://www.d20srd.org/srd/classes/barbarian.htm",
  "head": [
   "Level",
   "Base Attack Bonus",
   "Fort Save",
   "Ref Save",
   "Will Save",
   "Special"
  ],
  "levels": [
   {
    "level": 1,
    "bab": "+1",
    "fort": "+2",
    "ref": "+0",
    "will": "+0",
    "special": [
     "Fast movement",
     "illiteracy",
     "rage 1/day"
    ],
    "rest": []
   },
   {
    "level": 2,
    "bab": "+2",
    "fort": "+3",
    "ref": "+0",
    "will": "+0",
    "special": [
     "Uncanny dodge"
    ],
    "rest": []
   },
   {
    "level": 3,
    "bab": "+3",
    "fort": "+3",
    "ref": "+1",
    "will": "+1",
    "special": [
     "Trap sense +1"
    ],
    "rest": []
   },
   {
    "level": 4,
    "bab": "+4",
    "fort": "+4",
    "ref": "+1",
    "will": "+1",
    "special": [
     "Rage 2/day"
    ],
    "rest": []
   },
   {
    "level": 5,
    "bab": "+5",
    "fort": "+4",
    "ref": "+1",
    "will": "+1",
    "special": [
     "Improved uncanny dodge"
    ],
    "rest": []
   },
   {
    "level": 6,
    "bab": "+6/+1",
    "fort": "+5",
    "ref": "+2",
    "will": "+2",
    "special": [
     "Trap sense +2"
    ],
    "rest": []
   },
   {
    "level": 7,
    "bab": "+7/+2",
    "fort": "+5",
    "ref": "+2",
    "will": "+2",
    "special": [
     "Damage reduction 1/—"
    ],
    "rest": []
   },
   {
    "level": 8,
    "bab": "+8/+3",
    "fort": "+6",
    "ref": "+2",
    "will": "+2",
    "special": [
     "Rage 3/day"
    ],
    "rest": []
   },
   {
    "level": 9,
    "bab": "+9/+4",
    "fort": "+6",
    "ref": "+3",
    "will": "+3",
    "special": [
     "Trap sense +3"
    ],
    "rest": []
   },
   {
    "level": 10,
    "bab": "+10/+5",
    "fort": "+7",
    "ref": "+3",
    "will": "+3",
    "special": [
     "Damage reduction 2/—"
    ],
    "rest": []
   },
   {
    "level": 11,
    "bab": "+11/+6/+1",
    "fort": "+7",
    "ref": "+3",
    "will": "+3",
    "special": [
     "Greater rage"
    ],
    "rest": []
   },
   {
    "level": 12,
    "bab": "+12/+7/+2",
    "fort": "+8",
    "ref": "+4",
    "will": "+4",
    "special": [
     "Rage 4/day",
     "trap sense +4"
    ],
    "rest": []
   },
   {
    "level": 13,
    "bab": "+13/+8/+3",
    "fort": "+8",
    "ref": "+4",
    "will": "+4",
    "special": [
     "Damage reduction 3/—"
    ],
    "rest": []
   },
   {
    "level": 14,
    "bab": "+14/+9/+4",
    "fort": "+9",
    "ref": "+4",
    "will": "+4",
    "special": [
     "Indomitable will"
    ],
    "rest": []
   },
   {
    "level": 15,
    "bab": "+15/+10/+5",
    "fort": "+9",
    "ref": "+5",
    "will": "+5",
    "special": [
     "Trap sense +5"
    ],
    "rest": []
   },
   {
    "level": 16,
    "bab": "+16/+11/+6/+1",
    "fort": "+10",
    "ref": "+5",
    "will": "+5",
    "special": [
     "Damage reduction 4/—",
     "rage 5/day"
    ],
    "rest": []
   },
   {
    "level": 17,
    "bab": "+17/+12/+7/+2",
    "fort": "+10",
    "ref": "+5",
    "will": "+5",
    "special": [
     "Tireless rage"
    ],
    "rest": []
   },
   {
    "level": 18,
    "bab": "+18/+13/+8/+3",
    "fort": "+11",
    "ref": "+6",
    "will": "+6",
    "special": [
     "Trap sense +6"
    ],
    "rest": []
   },
   {
    "level": 19,
    "bab": "+19/+14/+9/+4",
    "fort": "+11",
    "ref": "+6",
    "will": "+6",
    "special": [
     "Damage reduction 5/—"
    ],
    "rest": []
   },
   {
    "level": 20,
    "bab": "+20/+15/+10/+5",
    "fort": "+12",
    "ref": "+6",
    "will": "+6",
    "special": [
     "Mighty rage",
     "rage 6/day"
    ],
    "rest": []
   }
  ]
 },
 "Bard": {
  "url": "https://www.d20srd.org/srd/classes/bard.htm",
  "head": [
   "Level",
   "Base Attack Bonus",
   "Fort Save",
   "Ref Save",
   "Will Save",
   "Special",
   "Spells per Day",
   "Spells Known"
  ],
  "levels": [
   {
    "level": 1,
    "bab": "+0",
    "fort": "+0",
    "ref": "+2",
    "will": "+2",
    "special": [
     "Bardic music",
     "bardic knowledge",
     "countersong",
     "fascinate",
     "inspire courage +1"
    ],
    "rest": [
     "2",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—",
     "4",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 2,
    "bab": "+1",
    "fort": "+0",
    "ref": "+3",
    "will": "+3",
    "special": [],
    "rest": [
     "3",
     "0",
     "—",
     "—",
     "—",
     "—",
     "—",
     "5",
     "2",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 3,
    "bab": "+2",
    "fort": "+1",
    "ref": "+3",
    "will": "+3",
    "special": [
     "Inspire competence"
    ],
    "rest": [
     "3",
     "1",
     "—",
     "—",
     "—",
     "—",
     "—",
     "6",
     "3",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 4,
    "bab": "+3",
    "fort": "+1",
    "ref": "+4",
    "will": "+4",
    "special": [],
    "rest": [
     "3",
     "2",
     "0",
     "—",
     "—",
     "—",
     "—",
     "6",
     "3",
     "2",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 5,
    "bab": "+3",
    "fort": "+1",
    "ref": "+4",
    "will": "+4",
    "special": [],
    "rest": [
     "3",
     "3",
     "1",
     "—",
     "—",
     "—",
     "—",
     "6",
     "4",
     "3",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 6,
    "bab": "+4",
    "fort": "+2",
    "ref": "+5",
    "will": "+5",
    "special": [
     "Suggestion"
    ],
    "rest": [
     "3",
     "3",
     "2",
     "—",
     "—",
     "—",
     "—",
     "6",
     "4",
     "3",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 7,
    "bab": "+5",
    "fort": "+2",
    "ref": "+5",
    "will": "+5",
    "special": [],
    "rest": [
     "3",
     "3",
     "2",
     "0",
     "—",
     "—",
     "—",
     "6",
     "4",
     "4",
     "2",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 8,
    "bab": "+6/+1",
    "fort": "+2",
    "ref": "+6",
    "will": "+6",
    "special": [
     "Inspire courage +2"
    ],
    "rest": [
     "3",
     "3",
     "3",
     "1",
     "—",
     "—",
     "—",
     "6",
     "4",
     "4",
     "3",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 9,
    "bab": "+6/+1",
    "fort": "+3",
    "ref": "+6",
    "will": "+6",
    "special": [
     "Inspire greatness"
    ],
    "rest": [
     "3",
     "3",
     "3",
     "2",
     "—",
     "—",
     "—",
     "6",
     "4",
     "4",
     "3",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 10,
    "bab": "+7/+2",
    "fort": "+3",
    "ref": "+7",
    "will": "+7",
    "special": [],
    "rest": [
     "3",
     "3",
     "3",
     "2",
     "0",
     "—",
     "—",
     "6",
     "4",
     "4",
     "4",
     "2",
     "—",
     "—"
    ]
   },
   {
    "level": 11,
    "bab": "+8/+3",
    "fort": "+3",
    "ref": "+7",
    "will": "+7",
    "special": [],
    "rest": [
     "3",
     "3",
     "3",
     "3",
     "1",
     "—",
     "—",
     "6",
     "4",
     "4",
     "4",
     "3",
     "—",
     "—"
    ]
   },
   {
    "level": 12,
    "bab": "+9/+4",
    "fort": "+4",
    "ref": "+8",
    "will": "+8",
    "special": [
     "Song of freedom"
    ],
    "rest": [
     "3",
     "3",
     "3",
     "3",
     "2",
     "—",
     "—",
     "6",
     "4",
     "4",
     "4",
     "3",
     "—",
     "—"
    ]
   },
   {
    "level": 13,
    "bab": "+9/+4",
    "fort": "+4",
    "ref": "+8",
    "will": "+8",
    "special": [],
    "rest": [
     "3",
     "3",
     "3",
     "3",
     "2",
     "0",
     "—",
     "6",
     "4",
     "4",
     "4",
     "4",
     "2",
     "—"
    ]
   },
   {
    "level": 14,
    "bab": "+10/+5",
    "fort": "+4",
    "ref": "+9",
    "will": "+9",
    "special": [
     "Inspire courage +3"
    ],
    "rest": [
     "4",
     "3",
     "3",
     "3",
     "3",
     "1",
     "—",
     "6",
     "4",
     "4",
     "4",
     "4",
     "3",
     "—"
    ]
   },
   {
    "level": 15,
    "bab": "+11/+6/+1",
    "fort": "+5",
    "ref": "+9",
    "will": "+9",
    "special": [
     "Inspire heroics"
    ],
    "rest": [
     "4",
     "4",
     "3",
     "3",
     "3",
     "2",
     "—",
     "6",
     "4",
     "4",
     "4",
     "4",
     "3",
     "—"
    ]
   },
   {
    "level": 16,
    "bab": "+12/+7/+2",
    "fort": "+5",
    "ref": "+10",
    "will": "+10",
    "special": [],
    "rest": [
     "4",
     "4",
     "4",
     "3",
     "3",
     "2",
     "0",
     "6",
     "5",
     "4",
     "4",
     "4",
     "4",
     "2"
    ]
   },
   {
    "level": 17,
    "bab": "+12/+7/+2",
    "fort": "+5",
    "ref": "+10",
    "will": "+10",
    "special": [],
    "rest": [
     "4",
     "4",
     "4",
     "4",
     "3",
     "3",
     "1",
     "6",
     "5",
     "5",
     "4",
     "4",
     "4",
     "3"
    ]
   },
   {
    "level": 18,
    "bab": "+13/+8/+3",
    "fort": "+6",
    "ref": "+11",
    "will": "+11",
    "special": [
     "Mass suggestion"
    ],
    "rest": [
     "4",
     "4",
     "4",
     "4",
     "4",
     "3",
     "2",
     "6",
     "5",
     "5",
     "5",
     "4",
     "4",
     "3"
    ]
   },
   {
    "level": 19,
    "bab": "+14/+9/+4",
    "fort": "+6",
    "ref": "+11",
    "will": "+11",
    "special": [],
    "rest": [
     "4",
     "4",
     "4",
     "4",
     "4",
     "4",
     "3",
     "6",
     "5",
     "5",
     "5",
     "5",
     "4",
     "4"
    ]
   },
   {
    "level": 20,
    "bab": "+15/+10/+5",
    "fort": "+6",
    "ref": "+12",
    "will": "+12",
    "special": [
     "Inspire courage +4"
    ],
    "rest": [
     "4",
     "4",
     "4",
     "4",
     "4",
     "4",
     "4",
     "6",
     "5",
     "5",
     "5",
     "5",
     "5",
     "4"
    ]
   }
  ]
 },
 "Cleric": {
  "url": "https://www.d20srd.org/srd/classes/cleric.htm",
  "head": [
   "Level",
   "Base Attack Bonus",
   "Fort Save",
   "Ref Save",
   "Will Save",
   "Special",
   "Spells per Day"
  ],
  "levels": [
   {
    "level": 1,
    "bab": "+0",
    "fort": "+2",
    "ref": "+0",
    "will": "+2",
    "special": [
     "Turn or rebuke undead"
    ],
    "rest": [
     "3",
     "1+1",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 2,
    "bab": "+1",
    "fort": "+3",
    "ref": "+0",
    "will": "+3",
    "special": [],
    "rest": [
     "4",
     "2+1",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 3,
    "bab": "+2",
    "fort": "+3",
    "ref": "+1",
    "will": "+3",
    "special": [],
    "rest": [
     "4",
     "2+1",
     "1+1",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 4,
    "bab": "+3",
    "fort": "+4",
    "ref": "+1",
    "will": "+4",
    "special": [],
    "rest": [
     "5",
     "3+1",
     "2+1",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 5,
    "bab": "+3",
    "fort": "+4",
    "ref": "+1",
    "will": "+4",
    "special": [],
    "rest": [
     "5",
     "3+1",
     "2+1",
     "1+1",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 6,
    "bab": "+4",
    "fort": "+5",
    "ref": "+2",
    "will": "+5",
    "special": [],
    "rest": [
     "5",
     "3+1",
     "3+1",
     "2+1",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 7,
    "bab": "+5",
    "fort": "+5",
    "ref": "+2",
    "will": "+5",
    "special": [],
    "rest": [
     "6",
     "4+1",
     "3+1",
     "2+1",
     "1+1",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 8,
    "bab": "+6/+1",
    "fort": "+6",
    "ref": "+2",
    "will": "+6",
    "special": [],
    "rest": [
     "6",
     "4+1",
     "3+1",
     "3+1",
     "2+1",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 9,
    "bab": "+6/+1",
    "fort": "+6",
    "ref": "+3",
    "will": "+6",
    "special": [],
    "rest": [
     "6",
     "4+1",
     "4+1",
     "3+1",
     "2+1",
     "1+1",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 10,
    "bab": "+7/+2",
    "fort": "+7",
    "ref": "+3",
    "will": "+7",
    "special": [],
    "rest": [
     "6",
     "4+1",
     "4+1",
     "3+1",
     "3+1",
     "2+1",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 11,
    "bab": "+8/+3",
    "fort": "+7",
    "ref": "+3",
    "will": "+7",
    "special": [],
    "rest": [
     "6",
     "5+1",
     "4+1",
     "4+1",
     "3+1",
     "2+1",
     "1+1",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 12,
    "bab": "+9/+4",
    "fort": "+8",
    "ref": "+4",
    "will": "+8",
    "special": [],
    "rest": [
     "6",
     "5+1",
     "4+1",
     "4+1",
     "3+1",
     "3+1",
     "2+1",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 13,
    "bab": "+9/+4",
    "fort": "+8",
    "ref": "+4",
    "will": "+8",
    "special": [],
    "rest": [
     "6",
     "5+1",
     "5+1",
     "4+1",
     "4+1",
     "3+1",
     "2+1",
     "1+1",
     "—",
     "—"
    ]
   },
   {
    "level": 14,
    "bab": "+10/+5",
    "fort": "+9",
    "ref": "+4",
    "will": "+9",
    "special": [],
    "rest": [
     "6",
     "5+1",
     "5+1",
     "4+1",
     "4+1",
     "3+1",
     "3+1",
     "2+1",
     "—",
     "—"
    ]
   },
   {
    "level": 15,
    "bab": "+11/+6/+1",
    "fort": "+9",
    "ref": "+5",
    "will": "+9",
    "special": [],
    "rest": [
     "6",
     "5+1",
     "5+1",
     "5+1",
     "4+1",
     "4+1",
     "3+1",
     "2+1",
     "1+1",
     "—"
    ]
   },
   {
    "level": 16,
    "bab": "+12/+7/+2",
    "fort": "+10",
    "ref": "+5",
    "will": "+10",
    "special": [],
    "rest": [
     "6",
     "5+1",
     "5+1",
     "5+1",
     "4+1",
     "4+1",
     "3+1",
     "3+1",
     "2+1",
     "—"
    ]
   },
   {
    "level": 17,
    "bab": "+12/+7/+2",
    "fort": "+10",
    "ref": "+5",
    "will": "+10",
    "special": [],
    "rest": [
     "6",
     "5+1",
     "5+1",
     "5+1",
     "5+1",
     "4+1",
     "4+1",
     "3+1",
     "2+1",
     "1+1"
    ]
   },
   {
    "level": 18,
    "bab": "+13/+8/+3",
    "fort": "+11",
    "ref": "+6",
    "will": "+11",
    "special": [],
    "rest": [
     "6",
     "5+1",
     "5+1",
     "5+1",
     "5+1",
     "4+1",
     "4+1",
     "3+1",
     "3+1",
     "2+1"
    ]
   },
   {
    "level": 19,
    "bab": "+14/+9/+4",
    "fort": "+11",
    "ref": "+6",
    "will": "+11",
    "special": [],
    "rest": [
     "6",
     "5+1",
     "5+1",
     "5+1",
     "5+1",
     "5+1",
     "4+1",
     "4+1",
     "3+1",
     "3+1"
    ]
   },
   {
    "level": 20,
    "bab": "+15/+10/+5",
    "fort": "+12",
    "ref": "+6",
    "will": "+12",
    "special": [],
    "rest": [
     "6",
     "5+1",
     "5+1",
     "5+1",
     "5+1",
     "5+1",
     "4+1",
     "4+1",
     "4+1",
     "4+1"
    ]
   }
  ]
 },
 "Druid": {
  "url": "https://www.d20srd.org/srd/classes/druid.htm",
  "head": [
   "Level",
   "Base Attack Bonus",
   "Fort Save",
   "Ref Save",
   "Will Save",
   "Special",
   "Spells per Day"
  ],
  "levels": [
   {
    "level": 1,
    "bab": "+0",
    "fort": "+2",
    "ref": "+0",
    "will": "+2",
    "special": [
     "Animal companion",
     "nature sense",
     "wild empathy"
    ],
    "rest": [
     "3",
     "1",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 2,
    "bab": "+1",
    "fort": "+3",
    "ref": "+0",
    "will": "+3",
    "special": [
     "Woodland stride"
    ],
    "rest": [
     "4",
     "2",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 3,
    "bab": "+2",
    "fort": "+3",
    "ref": "+1",
    "will": "+3",
    "special": [
     "Trackless step"
    ],
    "rest": [
     "4",
     "2",
     "1",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 4,
    "bab": "+3",
    "fort": "+4",
    "ref": "+1",
    "will": "+4",
    "special": [
     "Resist nature’s lure"
    ],
    "rest": [
     "5",
     "3",
     "2",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 5,
    "bab": "+3",
    "fort": "+4",
    "ref": "+1",
    "will": "+4",
    "special": [
     "Wild shape (1/day)"
    ],
    "rest": [
     "5",
     "3",
     "2",
     "1",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 6,
    "bab": "+4",
    "fort": "+5",
    "ref": "+2",
    "will": "+5",
    "special": [
     "Wild shape (2/day)"
    ],
    "rest": [
     "5",
     "3",
     "3",
     "2",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 7,
    "bab": "+5",
    "fort": "+5",
    "ref": "+2",
    "will": "+5",
    "special": [
     "Wild shape (3/day)"
    ],
    "rest": [
     "6",
     "4",
     "3",
     "2",
     "1",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 8,
    "bab": "+6/+1",
    "fort": "+6",
    "ref": "+2",
    "will": "+6",
    "special": [
     "Wild shape (Large)"
    ],
    "rest": [
     "6",
     "4",
     "3",
     "3",
     "2",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 9,
    "bab": "+6/+1",
    "fort": "+6",
    "ref": "+3",
    "will": "+6",
    "special": [
     "Venom immunity"
    ],
    "rest": [
     "6",
     "4",
     "4",
     "3",
     "2",
     "1",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 10,
    "bab": "+7/+2",
    "fort": "+7",
    "ref": "+3",
    "will": "+7",
    "special": [
     "Wild shape (4/day)"
    ],
    "rest": [
     "6",
     "4",
     "4",
     "3",
     "3",
     "2",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 11,
    "bab": "+8/+3",
    "fort": "+7",
    "ref": "+3",
    "will": "+7",
    "special": [
     "Wild shape (Tiny)"
    ],
    "rest": [
     "6",
     "5",
     "4",
     "4",
     "3",
     "2",
     "1",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 12,
    "bab": "+9/+4",
    "fort": "+8",
    "ref": "+4",
    "will": "+8",
    "special": [
     "Wild shape (plant)"
    ],
    "rest": [
     "6",
     "5",
     "4",
     "4",
     "3",
     "3",
     "2",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 13,
    "bab": "+9/+4",
    "fort": "+8",
    "ref": "+4",
    "will": "+8",
    "special": [
     "A thousand faces"
    ],
    "rest": [
     "6",
     "5",
     "5",
     "4",
     "4",
     "3",
     "2",
     "1",
     "—",
     "—"
    ]
   },
   {
    "level": 14,
    "bab": "+10/+5",
    "fort": "+9",
    "ref": "+4",
    "will": "+9",
    "special": [
     "Wild shape (5/day)"
    ],
    "rest": [
     "6",
     "5",
     "5",
     "4",
     "4",
     "3",
     "3",
     "2",
     "—",
     "—"
    ]
   },
   {
    "level": 15,
    "bab": "+11/+6/+1",
    "fort": "+9",
    "ref": "+5",
    "will": "+9",
    "special": [
     "Timeless body",
     "wild shape (Huge)"
    ],
    "rest": [
     "6",
     "5",
     "5",
     "5",
     "4",
     "4",
     "3",
     "2",
     "1",
     "—"
    ]
   },
   {
    "level": 16,
    "bab": "+12/+7/+2",
    "fort": "+10",
    "ref": "+5",
    "will": "+10",
    "special": [
     "Wild shape (elemental 1/day)"
    ],
    "rest": [
     "6",
     "5",
     "5",
     "5",
     "4",
     "4",
     "3",
     "3",
     "2",
     "—"
    ]
   },
   {
    "level": 17,
    "bab": "+12/+7/+2",
    "fort": "+10",
    "ref": "+5",
    "will": "+10",
    "special": [],
    "rest": [
     "6",
     "5",
     "5",
     "5",
     "5",
     "4",
     "4",
     "3",
     "2",
     "1"
    ]
   },
   {
    "level": 18,
    "bab": "+13/+8/+3",
    "fort": "+11",
    "ref": "+6",
    "will": "+11",
    "special": [
     "Wild shape (6/day, elemental 2/day)"
    ],
    "rest": [
     "6",
     "5",
     "5",
     "5",
     "5",
     "4",
     "4",
     "3",
     "3",
     "2"
    ]
   },
   {
    "level": 19,
    "bab": "+14/+9/+4",
    "fort": "+11",
    "ref": "+6",
    "will": "+11",
    "special": [],
    "rest": [
     "6",
     "5",
     "5",
     "5",
     "5",
     "5",
     "4",
     "4",
     "3",
     "3"
    ]
   },
   {
    "level": 20,
    "bab": "+15/+10/+5",
    "fort": "+12",
    "ref": "+6",
    "will": "+12",
    "special": [
     "Wild shape (elemental 3/day, Huge elemental)"
    ],
    "rest": [
     "6",
     "5",
     "5",
     "5",
     "5",
     "5",
     "4",
     "4",
     "4",
     "4"
    ]
   }
  ]
 },
 "Fighter": {
  "url": "https://www.d20srd.org/srd/classes/fighter.htm",
  "head": [
   "Level",
   "Base Attack Bonus",
   "Fort Save",
   "Ref Save",
   "Will Save",
   "Special"
  ],
  "levels": [
   {
    "level": 1,
    "bab": "+1",
    "fort": "+2",
    "ref": "+0",
    "will": "+0",
    "special": [
     "Bonus feat"
    ],
    "rest": []
   },
   {
    "level": 2,
    "bab": "+2",
    "fort": "+3",
    "ref": "+0",
    "will": "+0",
    "special": [
     "Bonus feat"
    ],
    "rest": []
   },
   {
    "level": 3,
    "bab": "+3",
    "fort": "+3",
    "ref": "+1",
    "will": "+1",
    "special": [],
    "rest": []
   },
   {
    "level": 4,
    "bab": "+4",
    "fort": "+4",
    "ref": "+1",
    "will": "+1",
    "special": [
     "Bonus feat"
    ],
    "rest": []
   },
   {
    "level": 5,
    "bab": "+5",
    "fort": "+4",
    "ref": "+1",
    "will": "+1",
    "special": [],
    "rest": []
   },
   {
    "level": 6,
    "bab": "+6/+1",
    "fort": "+5",
    "ref": "+2",
    "will": "+2",
    "special": [
     "Bonus feat"
    ],
    "rest": []
   },
   {
    "level": 7,
    "bab": "+7/+2",
    "fort": "+5",
    "ref": "+2",
    "will": "+2",
    "special": [],
    "rest": []
   },
   {
    "level": 8,
    "bab": "+8/+3",
    "fort": "+6",
    "ref": "+2",
    "will": "+2",
    "special": [
     "Bonus feat"
    ],
    "rest": []
   },
   {
    "level": 9,
    "bab": "+9/+4",
    "fort": "+6",
    "ref": "+3",
    "will": "+3",
    "special": [],
    "rest": []
   },
   {
    "level": 10,
    "bab": "+10/+5",
    "fort": "+7",
    "ref": "+3",
    "will": "+3",
    "special": [
     "Bonus feat"
    ],
    "rest": []
   },
   {
    "level": 11,
    "bab": "+11/+6/+1",
    "fort": "+7",
    "ref": "+3",
    "will": "+3",
    "special": [],
    "rest": []
   },
   {
    "level": 12,
    "bab": "+12/+7/+2",
    "fort": "+8",
    "ref": "+4",
    "will": "+4",
    "special": [
     "Bonus feat"
    ],
    "rest": []
   },
   {
    "level": 13,
    "bab": "+13/+8/+3",
    "fort": "+8",
    "ref": "+4",
    "will": "+4",
    "special": [],
    "rest": []
   },
   {
    "level": 14,
    "bab": "+14/+9/+4",
    "fort": "+9",
    "ref": "+4",
    "will": "+4",
    "special": [
     "Bonus feat"
    ],
    "rest": []
   },
   {
    "level": 15,
    "bab": "+15/+10/+5",
    "fort": "+9",
    "ref": "+5",
    "will": "+5",
    "special": [],
    "rest": []
   },
   {
    "level": 16,
    "bab": "+16/+11/+6/+1",
    "fort": "+10",
    "ref": "+5",
    "will": "+5",
    "special": [
     "Bonus feat"
    ],
    "rest": []
   },
   {
    "level": 17,
    "bab": "+17/+12/+7/+2",
    "fort": "+10",
    "ref": "+5",
    "will": "+5",
    "special": [],
    "rest": []
   },
   {
    "level": 18,
    "bab": "+18/+13/+8/+3",
    "fort": "+11",
    "ref": "+6",
    "will": "+6",
    "special": [
     "Bonus feat"
    ],
    "rest": []
   },
   {
    "level": 19,
    "bab": "+19/+14/+9/+4",
    "fort": "+11",
    "ref": "+6",
    "will": "+6",
    "special": [],
    "rest": []
   },
   {
    "level": 20,
    "bab": "+20/+15/+10/+5",
    "fort": "+12",
    "ref": "+6",
    "will": "+6",
    "special": [
     "Bonus feat"
    ],
    "rest": []
   }
  ]
 },
 "Monk": {
  "url": "https://www.d20srd.org/srd/classes/monk.htm",
  "head": [
   "Level",
   "Base Attack Bonus",
   "Fort Save",
   "Ref Save",
   "Will Save",
   "Special",
   "Flurry of Blows Attack Bonus",
   "Unarmed Damage",
   "AC Bonus",
   "Unarmored Speed Bonus"
  ],
  "levels": [
   {
    "level": 1,
    "bab": "+0",
    "fort": "+2",
    "ref": "+2",
    "will": "+2",
    "special": [
     "Bonus feat",
     "flurry of blows",
     "unarmed strike"
    ],
    "rest": [
     "-2/-2",
     "1d6",
     "+0",
     "+0 ft."
    ]
   },
   {
    "level": 2,
    "bab": "+1",
    "fort": "+3",
    "ref": "+3",
    "will": "+3",
    "special": [
     "Bonus feat",
     "evasion"
    ],
    "rest": [
     "-1/-1",
     "1d6",
     "+0",
     "+0 ft."
    ]
   },
   {
    "level": 3,
    "bab": "+2",
    "fort": "+3",
    "ref": "+3",
    "will": "+3",
    "special": [
     "Still mind"
    ],
    "rest": [
     "+0/+0",
     "1d6",
     "+0",
     "+10 ft."
    ]
   },
   {
    "level": 4,
    "bab": "+3",
    "fort": "+4",
    "ref": "+4",
    "will": "+4",
    "special": [
     "Ki strike (magic)",
     "slow fall 20 ft."
    ],
    "rest": [
     "+1/+1",
     "1d8",
     "+0",
     "+10 ft."
    ]
   },
   {
    "level": 5,
    "bab": "+3",
    "fort": "+4",
    "ref": "+4",
    "will": "+4",
    "special": [
     "Purity of body"
    ],
    "rest": [
     "+2/+2",
     "1d8",
     "+1",
     "+10 ft."
    ]
   },
   {
    "level": 6,
    "bab": "+4",
    "fort": "+5",
    "ref": "+5",
    "will": "+5",
    "special": [
     "Bonus feat",
     "slow fall 30 ft."
    ],
    "rest": [
     "+3/+3",
     "1d8",
     "+1",
     "+20 ft."
    ]
   },
   {
    "level": 7,
    "bab": "+5",
    "fort": "+5",
    "ref": "+5",
    "will": "+5",
    "special": [
     "Wholeness of body"
    ],
    "rest": [
     "+4/+4",
     "1d8",
     "+1",
     "+20 ft."
    ]
   },
   {
    "level": 8,
    "bab": "+6/+1",
    "fort": "+6",
    "ref": "+6",
    "will": "+6",
    "special": [
     "Slow fall 40 ft."
    ],
    "rest": [
     "+5/+5/+0",
     "1d10",
     "+1",
     "+20 ft."
    ]
   },
   {
    "level": 9,
    "bab": "+6/+1",
    "fort": "+6",
    "ref": "+6",
    "will": "+6",
    "special": [
     "Improved evasion"
    ],
    "rest": [
     "+6/+6/+1",
     "1d10",
     "+1",
     "+30 ft."
    ]
   },
   {
    "level": 10,
    "bab": "+7/+2",
    "fort": "+7",
    "ref": "+7",
    "will": "+7",
    "special": [
     "Ki strike (lawful)",
     "slow fall 50 ft."
    ],
    "rest": [
     "+7/+7/+2",
     "1d10",
     "+2",
     "+30 ft."
    ]
   },
   {
    "level": 11,
    "bab": "+8/+3",
    "fort": "+7",
    "ref": "+7",
    "will": "+7",
    "special": [
     "Diamond body",
     "greater flurry"
    ],
    "rest": [
     "+8/+8/+8/+3",
     "1d10",
     "+2",
     "+30 ft."
    ]
   },
   {
    "level": 12,
    "bab": "+9/+4",
    "fort": "+8",
    "ref": "+8",
    "will": "+8",
    "special": [
     "Abundant step",
     "slow fall 60 ft."
    ],
    "rest": [
     "+9/+9/+9/+4",
     "2d6",
     "+2",
     "+40 ft."
    ]
   },
   {
    "level": 13,
    "bab": "+9/+4",
    "fort": "+8",
    "ref": "+8",
    "will": "+8",
    "special": [
     "Diamond soul"
    ],
    "rest": [
     "+9/+9/+9/+4",
     "2d6",
     "+2",
     "+40 ft."
    ]
   },
   {
    "level": 14,
    "bab": "+10/+5",
    "fort": "+9",
    "ref": "+9",
    "will": "+9",
    "special": [
     "Slow fall 70 ft."
    ],
    "rest": [
     "+10/+10/+10/+5",
     "2d6",
     "+2",
     "+40 ft."
    ]
   },
   {
    "level": 15,
    "bab": "+11/+6/+1",
    "fort": "+9",
    "ref": "+9",
    "will": "+9",
    "special": [
     "Quivering palm"
    ],
    "rest": [
     "+11/+11/+11/+6/+1",
     "2d6",
     "+3",
     "+50 ft."
    ]
   },
   {
    "level": 16,
    "bab": "+12/+7/+2",
    "fort": "+10",
    "ref": "+10",
    "will": "+10",
    "special": [
     "Ki strike (adamantine)",
     "slow fall 80 ft."
    ],
    "rest": [
     "+12/+12/+12/+7/+2",
     "2d8",
     "+3",
     "+50 ft."
    ]
   },
   {
    "level": 17,
    "bab": "+12/+7/+2",
    "fort": "+10",
    "ref": "+10",
    "will": "+10",
    "special": [
     "Timeless body",
     "tongue of the sun and moon"
    ],
    "rest": [
     "+12/+12/+12/+7/+2",
     "2d8",
     "+3",
     "+50 ft."
    ]
   },
   {
    "level": 18,
    "bab": "+13/+8/+3",
    "fort": "+11",
    "ref": "+11",
    "will": "+11",
    "special": [
     "Slow fall 90 ft."
    ],
    "rest": [
     "+13/+13/+13/+8/+3",
     "2d8",
     "+3",
     "+60 ft."
    ]
   },
   {
    "level": 19,
    "bab": "+14/+9/+4",
    "fort": "+11",
    "ref": "+11",
    "will": "+11",
    "special": [
     "Empty body"
    ],
    "rest": [
     "+14/+14/+14/+9/+4",
     "2d8",
     "+3",
     "+60 ft."
    ]
   },
   {
    "level": 20,
    "bab": "+15/+10/+5",
    "fort": "+12",
    "ref": "+12",
    "will": "+12",
    "special": [
     "Perfect self",
     "slow fall any distance"
    ],
    "rest": [
     "+15/+15/+15/+10/+5",
     "2d10",
     "+4",
     "+60 ft."
    ]
   }
  ]
 },
 "Paladin": {
  "url": "https://www.d20srd.org/srd/classes/paladin.htm",
  "head": [
   "Level",
   "Base Attack Bonus",
   "Fort Save",
   "Ref Save",
   "Will Save",
   "Special",
   "Spells per Day"
  ],
  "levels": [
   {
    "level": 1,
    "bab": "+1",
    "fort": "+2",
    "ref": "+0",
    "will": "+0",
    "special": [
     "Aura of good",
     "detect evil",
     "smite evil 1/day"
    ],
    "rest": [
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 2,
    "bab": "+2",
    "fort": "+3",
    "ref": "+0",
    "will": "+0",
    "special": [
     "Divine grace",
     "lay on hands"
    ],
    "rest": [
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 3,
    "bab": "+3",
    "fort": "+3",
    "ref": "+1",
    "will": "+1",
    "special": [
     "Aura of courage",
     "divine health"
    ],
    "rest": [
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 4,
    "bab": "+4",
    "fort": "+4",
    "ref": "+1",
    "will": "+1",
    "special": [
     "Turn undead"
    ],
    "rest": [
     "0",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 5,
    "bab": "+5",
    "fort": "+4",
    "ref": "+1",
    "will": "+1",
    "special": [
     "Smite evil 2/day",
     "special mount"
    ],
    "rest": [
     "0",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 6,
    "bab": "+6/+1",
    "fort": "+5",
    "ref": "+2",
    "will": "+2",
    "special": [
     "Remove disease 1/week"
    ],
    "rest": [
     "1",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 7,
    "bab": "+7/+2",
    "fort": "+5",
    "ref": "+2",
    "will": "+2",
    "special": [],
    "rest": [
     "1",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 8,
    "bab": "+8/+3",
    "fort": "+6",
    "ref": "+2",
    "will": "+2",
    "special": [],
    "rest": [
     "1",
     "0",
     "—",
     "—"
    ]
   },
   {
    "level": 9,
    "bab": "+9/+4",
    "fort": "+6",
    "ref": "+3",
    "will": "+3",
    "special": [
     "Remove disease 2/week"
    ],
    "rest": [
     "1",
     "0",
     "—",
     "—"
    ]
   },
   {
    "level": 10,
    "bab": "+10/+5",
    "fort": "+7",
    "ref": "+3",
    "will": "+3",
    "special": [
     "Smite evil 3/day"
    ],
    "rest": [
     "1",
     "1",
     "—",
     "—"
    ]
   },
   {
    "level": 11,
    "bab": "+11/+6/+1",
    "fort": "+7",
    "ref": "+3",
    "will": "+3",
    "special": [],
    "rest": [
     "1",
     "1",
     "0",
     "—"
    ]
   },
   {
    "level": 12,
    "bab": "+12/+7/+2",
    "fort": "+8",
    "ref": "+4",
    "will": "+4",
    "special": [
     "Remove disease 3/week"
    ],
    "rest": [
     "1",
     "1",
     "1",
     "—"
    ]
   },
   {
    "level": 13,
    "bab": "+13/+8/+3",
    "fort": "+8",
    "ref": "+4",
    "will": "+4",
    "special": [],
    "rest": [
     "1",
     "1",
     "1",
     "—"
    ]
   },
   {
    "level": 14,
    "bab": "+14/+9/+4",
    "fort": "+9",
    "ref": "+4",
    "will": "+4",
    "special": [],
    "rest": [
     "2",
     "1",
     "1",
     "0"
    ]
   },
   {
    "level": 15,
    "bab": "+15/+10/+5",
    "fort": "+9",
    "ref": "+5",
    "will": "+5",
    "special": [
     "Remove disease 4/week",
     "smite evil 4/day"
    ],
    "rest": [
     "2",
     "1",
     "1",
     "1"
    ]
   },
   {
    "level": 16,
    "bab": "+16/+11/+6/+1",
    "fort": "+10",
    "ref": "+5",
    "will": "+5",
    "special": [],
    "rest": [
     "2",
     "2",
     "1",
     "1"
    ]
   },
   {
    "level": 17,
    "bab": "+17/+12/+7/+2",
    "fort": "+10",
    "ref": "+5",
    "will": "+5",
    "special": [],
    "rest": [
     "2",
     "2",
     "2",
     "1"
    ]
   },
   {
    "level": 18,
    "bab": "+18/+13/+8/+3",
    "fort": "+11",
    "ref": "+6",
    "will": "+6",
    "special": [
     "Remove disease 5/week"
    ],
    "rest": [
     "3",
     "2",
     "2",
     "1"
    ]
   },
   {
    "level": 19,
    "bab": "+19/+14/+9/+4",
    "fort": "+11",
    "ref": "+6",
    "will": "+6",
    "special": [],
    "rest": [
     "3",
     "3",
     "3",
     "2"
    ]
   },
   {
    "level": 20,
    "bab": "+20/+15/+10/+5",
    "fort": "+12",
    "ref": "+6",
    "will": "+6",
    "special": [
     "Smite evil 5/day"
    ],
    "rest": [
     "3",
     "3",
     "3",
     "3"
    ]
   }
  ]
 },
 "Ranger": {
  "url": "https://www.d20srd.org/srd/classes/ranger.htm",
  "head": [
   "Level",
   "Base Attack Bonus",
   "Fort Save",
   "Ref Save",
   "Will Save",
   "Special",
   "Spells per Day"
  ],
  "levels": [
   {
    "level": 1,
    "bab": "+1",
    "fort": "+2",
    "ref": "+2",
    "will": "+0",
    "special": [
     "1st favored enemy",
     "Track",
     "wild empathy"
    ],
    "rest": [
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 2,
    "bab": "+2",
    "fort": "+3",
    "ref": "+3",
    "will": "+0",
    "special": [
     "Combat style"
    ],
    "rest": [
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 3,
    "bab": "+3",
    "fort": "+3",
    "ref": "+3",
    "will": "+1",
    "special": [
     "Endurance"
    ],
    "rest": [
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 4,
    "bab": "+4",
    "fort": "+4",
    "ref": "+4",
    "will": "+1",
    "special": [
     "Animal companion"
    ],
    "rest": [
     "0",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 5,
    "bab": "+5",
    "fort": "+4",
    "ref": "+4",
    "will": "+1",
    "special": [
     "2nd favored enemy"
    ],
    "rest": [
     "0",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 6,
    "bab": "+6/+1",
    "fort": "+5",
    "ref": "+5",
    "will": "+2",
    "special": [
     "Improved combat style"
    ],
    "rest": [
     "1",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 7,
    "bab": "+7/+2",
    "fort": "+5",
    "ref": "+5",
    "will": "+2",
    "special": [
     "Woodland stride"
    ],
    "rest": [
     "1",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 8,
    "bab": "+8/+3",
    "fort": "+6",
    "ref": "+6",
    "will": "+2",
    "special": [
     "Swift tracker"
    ],
    "rest": [
     "1",
     "0",
     "—",
     "—"
    ]
   },
   {
    "level": 9,
    "bab": "+9/+4",
    "fort": "+6",
    "ref": "+6",
    "will": "+3",
    "special": [
     "Evasion"
    ],
    "rest": [
     "1",
     "0",
     "—",
     "—"
    ]
   },
   {
    "level": 10,
    "bab": "+10/+5",
    "fort": "+7",
    "ref": "+7",
    "will": "+3",
    "special": [
     "3rd favored enemy"
    ],
    "rest": [
     "1",
     "1",
     "—",
     "—"
    ]
   },
   {
    "level": 11,
    "bab": "+11/+6/+1",
    "fort": "+7",
    "ref": "+7",
    "will": "+3",
    "special": [
     "Combat style mastery"
    ],
    "rest": [
     "1",
     "1",
     "0",
     "—"
    ]
   },
   {
    "level": 12,
    "bab": "+12/+7/+2",
    "fort": "+8",
    "ref": "+8",
    "will": "+4",
    "special": [],
    "rest": [
     "1",
     "1",
     "1",
     "—"
    ]
   },
   {
    "level": 13,
    "bab": "+13/+8/+3",
    "fort": "+8",
    "ref": "+8",
    "will": "+4",
    "special": [
     "Camouflage"
    ],
    "rest": [
     "1",
     "1",
     "1",
     "—"
    ]
   },
   {
    "level": 14,
    "bab": "+14/+9/+4",
    "fort": "+9",
    "ref": "+9",
    "will": "+4",
    "special": [],
    "rest": [
     "2",
     "1",
     "1",
     "0"
    ]
   },
   {
    "level": 15,
    "bab": "+15/+10/+5",
    "fort": "+9",
    "ref": "+9",
    "will": "+5",
    "special": [
     "4th favored enemy"
    ],
    "rest": [
     "2",
     "1",
     "1",
     "1"
    ]
   },
   {
    "level": 16,
    "bab": "+16/+11/+6/+1",
    "fort": "+10",
    "ref": "+10",
    "will": "+5",
    "special": [],
    "rest": [
     "2",
     "2",
     "1",
     "1"
    ]
   },
   {
    "level": 17,
    "bab": "+17/+12/+7/+2",
    "fort": "+10",
    "ref": "+10",
    "will": "+5",
    "special": [
     "Hide in plain sight"
    ],
    "rest": [
     "2",
     "2",
     "2",
     "1"
    ]
   },
   {
    "level": 18,
    "bab": "+18/+13/+8/+3",
    "fort": "+11",
    "ref": "+11",
    "will": "+6",
    "special": [],
    "rest": [
     "3",
     "2",
     "2",
     "1"
    ]
   },
   {
    "level": 19,
    "bab": "+19/+14/+9/+4",
    "fort": "+11",
    "ref": "+11",
    "will": "+6",
    "special": [],
    "rest": [
     "3",
     "3",
     "3",
     "2"
    ]
   },
   {
    "level": 20,
    "bab": "+20/+15/+10/+5",
    "fort": "+12",
    "ref": "+12",
    "will": "+6",
    "special": [
     "5th favored enemy"
    ],
    "rest": [
     "3",
     "3",
     "3",
     "3"
    ]
   }
  ]
 },
 "Rogue": {
  "url": "https://www.d20srd.org/srd/classes/rogue.htm",
  "head": [
   "Level",
   "Base Attack Bonus",
   "Fort Save",
   "Ref Save",
   "Will Save",
   "Special"
  ],
  "levels": [
   {
    "level": 1,
    "bab": "+0",
    "fort": "+0",
    "ref": "+2",
    "will": "+0",
    "special": [
     "Sneak attack +1d6",
     "trapfinding"
    ],
    "rest": []
   },
   {
    "level": 2,
    "bab": "+1",
    "fort": "+0",
    "ref": "+3",
    "will": "+0",
    "special": [
     "Evasion"
    ],
    "rest": []
   },
   {
    "level": 3,
    "bab": "+2",
    "fort": "+1",
    "ref": "+3",
    "will": "+1",
    "special": [
     "Sneak attack +2d6",
     "trap sense +1"
    ],
    "rest": []
   },
   {
    "level": 4,
    "bab": "+3",
    "fort": "+1",
    "ref": "+4",
    "will": "+1",
    "special": [
     "Uncanny dodge"
    ],
    "rest": []
   },
   {
    "level": 5,
    "bab": "+3",
    "fort": "+1",
    "ref": "+4",
    "will": "+1",
    "special": [
     "Sneak attack +3d6"
    ],
    "rest": []
   },
   {
    "level": 6,
    "bab": "+4",
    "fort": "+2",
    "ref": "+5",
    "will": "+2",
    "special": [
     "Trap sense +2"
    ],
    "rest": []
   },
   {
    "level": 7,
    "bab": "+5",
    "fort": "+2",
    "ref": "+5",
    "will": "+2",
    "special": [
     "Sneak attack +4d6"
    ],
    "rest": []
   },
   {
    "level": 8,
    "bab": "+6/+1",
    "fort": "+2",
    "ref": "+6",
    "will": "+2",
    "special": [
     "Improved uncanny dodge"
    ],
    "rest": []
   },
   {
    "level": 9,
    "bab": "+6/+1",
    "fort": "+3",
    "ref": "+6",
    "will": "+3",
    "special": [
     "Sneak attack +5d6",
     "trap sense +3"
    ],
    "rest": []
   },
   {
    "level": 10,
    "bab": "+7/+2",
    "fort": "+3",
    "ref": "+7",
    "will": "+3",
    "special": [
     "Special ability"
    ],
    "rest": []
   },
   {
    "level": 11,
    "bab": "+8/+3",
    "fort": "+3",
    "ref": "+7",
    "will": "+3",
    "special": [
     "Sneak attack +6d6"
    ],
    "rest": []
   },
   {
    "level": 12,
    "bab": "+9/+4",
    "fort": "+4",
    "ref": "+8",
    "will": "+4",
    "special": [
     "Trap sense +4"
    ],
    "rest": []
   },
   {
    "level": 13,
    "bab": "+9/+4",
    "fort": "+4",
    "ref": "+8",
    "will": "+4",
    "special": [
     "Sneak attack +7d6",
     "special ability"
    ],
    "rest": []
   },
   {
    "level": 14,
    "bab": "+10/+5",
    "fort": "+4",
    "ref": "+9",
    "will": "+4",
    "special": [],
    "rest": []
   },
   {
    "level": 15,
    "bab": "+11/+6/+1",
    "fort": "+5",
    "ref": "+9",
    "will": "+5",
    "special": [
     "Sneak attack +8d6",
     "trap sense +5"
    ],
    "rest": []
   },
   {
    "level": 16,
    "bab": "+12/+7/+2",
    "fort": "+5",
    "ref": "+10",
    "will": "+5",
    "special": [
     "Special ability"
    ],
    "rest": []
   },
   {
    "level": 17,
    "bab": "+12/+7/+2",
    "fort": "+5",
    "ref": "+10",
    "will": "+5",
    "special": [
     "Sneak attack +9d6"
    ],
    "rest": []
   },
   {
    "level": 18,
    "bab": "+13/+8/+3",
    "fort": "+6",
    "ref": "+11",
    "will": "+6",
    "special": [
     "Trap sense +6"
    ],
    "rest": []
   },
   {
    "level": 19,
    "bab": "+14/+9/+4",
    "fort": "+6",
    "ref": "+11",
    "will": "+6",
    "special": [
     "Sneak attack +10d6",
     "special ability"
    ],
    "rest": []
   },
   {
    "level": 20,
    "bab": "+15/+10/+5",
    "fort": "+6",
    "ref": "+12",
    "will": "+6",
    "special": [],
    "rest": []
   }
  ]
 },
 "Sorcerer": {
  "url": "https://www.d20srd.org/srd/classes/sorcererWizard.htm",
  "head": [
   "Level",
   "Base Attack Bonus",
   "Fort Save",
   "Ref Save",
   "Will Save",
   "Special",
   "Spells per Day"
  ],
  "levels": [
   {
    "level": 1,
    "bab": "+0",
    "fort": "+0",
    "ref": "+0",
    "will": "+2",
    "special": [
     "Summon familiar"
    ],
    "rest": [
     "5",
     "3",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 2,
    "bab": "+1",
    "fort": "+0",
    "ref": "+0",
    "will": "+3",
    "special": [],
    "rest": [
     "6",
     "4",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 3,
    "bab": "+1",
    "fort": "+1",
    "ref": "+1",
    "will": "+3",
    "special": [],
    "rest": [
     "6",
     "5",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 4,
    "bab": "+2",
    "fort": "+1",
    "ref": "+1",
    "will": "+4",
    "special": [],
    "rest": [
     "6",
     "6",
     "3",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 5,
    "bab": "+2",
    "fort": "+1",
    "ref": "+1",
    "will": "+4",
    "special": [],
    "rest": [
     "6",
     "6",
     "4",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 6,
    "bab": "+3",
    "fort": "+2",
    "ref": "+2",
    "will": "+5",
    "special": [],
    "rest": [
     "6",
     "6",
     "5",
     "3",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 7,
    "bab": "+3",
    "fort": "+2",
    "ref": "+2",
    "will": "+5",
    "special": [],
    "rest": [
     "6",
     "6",
     "6",
     "4",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 8,
    "bab": "+4",
    "fort": "+2",
    "ref": "+2",
    "will": "+6",
    "special": [],
    "rest": [
     "6",
     "6",
     "6",
     "5",
     "3",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 9,
    "bab": "+4",
    "fort": "+3",
    "ref": "+3",
    "will": "+6",
    "special": [],
    "rest": [
     "6",
     "6",
     "6",
     "6",
     "4",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 10,
    "bab": "+5",
    "fort": "+3",
    "ref": "+3",
    "will": "+7",
    "special": [],
    "rest": [
     "6",
     "6",
     "6",
     "6",
     "5",
     "3",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 11,
    "bab": "+5",
    "fort": "+3",
    "ref": "+3",
    "will": "+7",
    "special": [],
    "rest": [
     "6",
     "6",
     "6",
     "6",
     "6",
     "4",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 12,
    "bab": "+6/+1",
    "fort": "+4",
    "ref": "+4",
    "will": "+8",
    "special": [],
    "rest": [
     "6",
     "6",
     "6",
     "6",
     "6",
     "5",
     "3",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 13,
    "bab": "+6/+1",
    "fort": "+4",
    "ref": "+4",
    "will": "+8",
    "special": [],
    "rest": [
     "6",
     "6",
     "6",
     "6",
     "6",
     "6",
     "4",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 14,
    "bab": "+7/+2",
    "fort": "+4",
    "ref": "+4",
    "will": "+9",
    "special": [],
    "rest": [
     "6",
     "6",
     "6",
     "6",
     "6",
     "6",
     "5",
     "3",
     "—",
     "—"
    ]
   },
   {
    "level": 15,
    "bab": "+7/+2",
    "fort": "+5",
    "ref": "+5",
    "will": "+9",
    "special": [],
    "rest": [
     "6",
     "6",
     "6",
     "6",
     "6",
     "6",
     "6",
     "4",
     "—",
     "—"
    ]
   },
   {
    "level": 16,
    "bab": "+8/+3",
    "fort": "+5",
    "ref": "+5",
    "will": "+10",
    "special": [],
    "rest": [
     "6",
     "6",
     "6",
     "6",
     "6",
     "6",
     "6",
     "5",
     "3",
     "—"
    ]
   },
   {
    "level": 17,
    "bab": "+8/+3",
    "fort": "+5",
    "ref": "+5",
    "will": "+10",
    "special": [],
    "rest": [
     "6",
     "6",
     "6",
     "6",
     "6",
     "6",
     "6",
     "6",
     "4",
     "—"
    ]
   },
   {
    "level": 18,
    "bab": "+9/+4",
    "fort": "+6",
    "ref": "+6",
    "will": "+11",
    "special": [],
    "rest": [
     "6",
     "6",
     "6",
     "6",
     "6",
     "6",
     "6",
     "6",
     "5",
     "3"
    ]
   },
   {
    "level": 19,
    "bab": "+9/+4",
    "fort": "+6",
    "ref": "+6",
    "will": "+11",
    "special": [],
    "rest": [
     "6",
     "6",
     "6",
     "6",
     "6",
     "6",
     "6",
     "6",
     "6",
     "4"
    ]
   },
   {
    "level": 20,
    "bab": "+10/+5",
    "fort": "+6",
    "ref": "+6",
    "will": "+12",
    "special": [],
    "rest": [
     "6",
     "6",
     "6",
     "6",
     "6",
     "6",
     "6",
     "6",
     "6",
     "6"
    ]
   }
  ]
 },
 "Wizard": {
  "url": "https://www.d20srd.org/srd/classes/sorcererWizard.htm",
  "head": [
   "Level",
   "Base Attack Bonus",
   "Fort Save",
   "Ref Save",
   "Will Save",
   "Special",
   "Spells per Day"
  ],
  "levels": [
   {
    "level": 1,
    "bab": "+0",
    "fort": "+0",
    "ref": "+0",
    "will": "+2",
    "special": [
     "Summon familiar",
     "Scribe Scroll"
    ],
    "rest": [
     "3",
     "1",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 2,
    "bab": "+1",
    "fort": "+0",
    "ref": "+0",
    "will": "+3",
    "special": [],
    "rest": [
     "4",
     "2",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 3,
    "bab": "+1",
    "fort": "+1",
    "ref": "+1",
    "will": "+3",
    "special": [],
    "rest": [
     "4",
     "2",
     "1",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 4,
    "bab": "+2",
    "fort": "+1",
    "ref": "+1",
    "will": "+4",
    "special": [],
    "rest": [
     "4",
     "3",
     "2",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 5,
    "bab": "+2",
    "fort": "+1",
    "ref": "+1",
    "will": "+4",
    "special": [
     "Bonus feat"
    ],
    "rest": [
     "4",
     "3",
     "2",
     "1",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 6,
    "bab": "+3",
    "fort": "+2",
    "ref": "+2",
    "will": "+5",
    "special": [],
    "rest": [
     "4",
     "3",
     "3",
     "2",
     "—",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 7,
    "bab": "+3",
    "fort": "+2",
    "ref": "+2",
    "will": "+5",
    "special": [],
    "rest": [
     "4",
     "4",
     "3",
     "2",
     "1",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 8,
    "bab": "+4",
    "fort": "+2",
    "ref": "+2",
    "will": "+6",
    "special": [],
    "rest": [
     "4",
     "4",
     "3",
     "3",
     "2",
     "—",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 9,
    "bab": "+4",
    "fort": "+3",
    "ref": "+3",
    "will": "+6",
    "special": [],
    "rest": [
     "4",
     "4",
     "4",
     "3",
     "2",
     "1",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 10,
    "bab": "+5",
    "fort": "+3",
    "ref": "+3",
    "will": "+7",
    "special": [
     "Bonus feat"
    ],
    "rest": [
     "4",
     "4",
     "4",
     "3",
     "3",
     "2",
     "—",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 11,
    "bab": "+5",
    "fort": "+3",
    "ref": "+3",
    "will": "+7",
    "special": [],
    "rest": [
     "4",
     "4",
     "4",
     "4",
     "3",
     "2",
     "1",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 12,
    "bab": "+6/+1",
    "fort": "+4",
    "ref": "+4",
    "will": "+8",
    "special": [],
    "rest": [
     "4",
     "4",
     "4",
     "4",
     "3",
     "3",
     "2",
     "—",
     "—",
     "—"
    ]
   },
   {
    "level": 13,
    "bab": "+6/+1",
    "fort": "+4",
    "ref": "+4",
    "will": "+8",
    "special": [],
    "rest": [
     "4",
     "4",
     "4",
     "4",
     "4",
     "3",
     "2",
     "1",
     "—",
     "—"
    ]
   },
   {
    "level": 14,
    "bab": "+7/+2",
    "fort": "+4",
    "ref": "+4",
    "will": "+9",
    "special": [],
    "rest": [
     "4",
     "4",
     "4",
     "4",
     "4",
     "3",
     "3",
     "2",
     "—",
     "—"
    ]
   },
   {
    "level": 15,
    "bab": "+7/+2",
    "fort": "+5",
    "ref": "+5",
    "will": "+9",
    "special": [
     "Bonus feat"
    ],
    "rest": [
     "4",
     "4",
     "4",
     "4",
     "4",
     "4",
     "3",
     "2",
     "1",
     "—"
    ]
   },
   {
    "level": 16,
    "bab": "+8/+3",
    "fort": "+5",
    "ref": "+5",
    "will": "+10",
    "special": [],
    "rest": [
     "4",
     "4",
     "4",
     "4",
     "4",
     "4",
     "3",
     "3",
     "2",
     "—"
    ]
   },
   {
    "level": 17,
    "bab": "+8/+3",
    "fort": "+5",
    "ref": "+5",
    "will": "+10",
    "special": [],
    "rest": [
     "4",
     "4",
     "4",
     "4",
     "4",
     "4",
     "4",
     "3",
     "2",
     "1"
    ]
   },
   {
    "level": 18,
    "bab": "+9/+4",
    "fort": "+6",
    "ref": "+6",
    "will": "+11",
    "special": [],
    "rest": [
     "4",
     "4",
     "4",
     "4",
     "4",
     "4",
     "4",
     "3",
     "3",
     "2"
    ]
   },
   {
    "level": 19,
    "bab": "+9/+4",
    "fort": "+6",
    "ref": "+6",
    "will": "+11",
    "special": [],
    "rest": [
     "4",
     "4",
     "4",
     "4",
     "4",
     "4",
     "4",
     "4",
     "3",
     "3"
    ]
   },
   {
    "level": 20,
    "bab": "+10/+5",
    "fort": "+6",
    "ref": "+6",
    "will": "+12",
    "special": [
     "Bonus feat"
    ],
    "rest": [
     "4",
     "4",
     "4",
     "4",
     "4",
     "4",
     "4",
     "4",
     "4",
     "4"
    ]
   }
  ]
 }
};

/** a class's row at a class level, or null */
export const srdRow = (path, classLevel) => {
    const t = SRD_CLASS_TABLES[path];
    return (t && t.levels.find((r) => r.level === classLevel)) || null;
};

/** the features a class level brings, as the table's Special column names them */
export const srdSpecial = (path, classLevel) => {
    const r = srdRow(path, classLevel);
    return r ? r.special.slice() : [];
};
