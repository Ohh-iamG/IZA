"""
Red-flag screening shared by the CLI, the web app and the Confidant.

This is a tripwire, not a diagnosis. It errs toward telling you to get help.
It never tells you that you are fine.
"""

from __future__ import annotations

import re

EMERGENCY = "Call 000 now. If you are on site, also alert your site medic or ERT."
CRISIS = ("Call 000 if you are in danger now. Lifeline 13 11 14 (24/7, call or text) "
          "or Beyond Blue 1300 22 4636.")
NON_URGENT = "Not sure if it is urgent? healthdirect 1800 022 222 (24/7, registered nurses)."

_EMERGENCY_PATTERNS = [
    r"chest (pain|tight|pressure|crush)", r"crushing", r"pain (in|down) (my )?(left )?arm",
    r"can'?t breathe", r"cannot breathe", r"short(ness)? of breath", r"trouble breathing",
    r"struggling to breathe", r"choking", r"lips? (blue|swelling)", r"throat (closing|swelling)",
    r"face (droop|drooping)", r"slurred speech", r"can'?t (speak|talk) properly",
    r"(weak|numb)(ness)? (on )?(one|left|right) side", r"sudden (severe )?headache",
    r"worst headache", r"seizure", r"fitting", r"passed out", r"fainted", r"unconscious",
    r"collapsed", r"coughing (up )?blood", r"vomiting blood", r"severe bleeding",
    r"won'?t stop bleeding", r"overdose", r"took too many", r"anaphyla", r"severe allerg",
    r"stiff neck.*(rash|fever)", r"confus(ed|ion).*sudden", r"heat ?stroke",
    r"stopped sweating",
]
_CRISIS_PATTERNS = [
    r"suicid", r"kill myself", r"end (it|my life)", r"don'?t want to (live|be here)",
    r"hurt(ing)? myself", r"self[- ]harm",
]

_E = re.compile("|".join(_EMERGENCY_PATTERNS), re.I)
_C = re.compile("|".join(_CRISIS_PATTERNS), re.I)


def screen(text: str) -> str | None:
    """Return an urgent message if the text contains a red flag, else None."""
    if not text:
        return None
    if _C.search(text):
        return CRISIS
    if _E.search(text):
        return EMERGENCY
    return None


DOSING = re.compile(r"\b(how (much|many)|dose|dosage|double up|extra (pill|tablet)|"
                    r"mix(ing)? .* with|take .* with|missed (a|my) dose)\b", re.I)
