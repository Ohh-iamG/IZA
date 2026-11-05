"""
IZA - local voice capture (faster-whisper). Nothing leaves the machine.

    pip install faster-whisper sounddevice numpy

Env:
    IZA_WHISPER_MODEL   tiny | base | small | medium   (default small: better on drug names)
    IZA_WHISPER_DEVICE  cpu | cuda                     (default cpu)
"""

from __future__ import annotations

import difflib
import os
import re

_MODEL = None


def _model():
    global _MODEL
    if _MODEL is None:
        from faster_whisper import WhisperModel
        device = os.getenv("IZA_WHISPER_DEVICE", "cpu")
        _MODEL = WhisperModel(os.getenv("IZA_WHISPER_MODEL", "small"), device=device,
                              compute_type="int8" if device == "cpu" else "float16")
    return _MODEL


def transcribe_file(path: str, hint_words: list[str] | None = None) -> str:
    segs, _ = _model().transcribe(path, vad_filter=True,
                                  initial_prompt=", ".join(hint_words) if hint_words else None)
    return " ".join(s.text.strip() for s in segs).strip()


def record_and_transcribe(seconds: float = 15.0, hint_words: list[str] | None = None,
                          samplerate: int = 16000) -> str:
    import numpy as np
    import sounddevice as sd
    print(f"  recording {seconds:.0f}s - speak now...")
    audio = sd.rec(int(seconds * samplerate), samplerate=samplerate, channels=1, dtype="float32")
    sd.wait()
    print("  ...transcribing on this machine")
    segs, _ = _model().transcribe(np.squeeze(audio), vad_filter=True,
                                  initial_prompt=", ".join(hint_words) if hint_words else None)
    return " ".join(s.text.strip() for s in segs).strip()


def check_med_names(text: str, known: list[str]) -> list[str]:
    """Flag words that look like one of your medications but are not spelled
    the same - the classic speech-to-text drug-name error."""
    warnings = []
    known_l = {k.lower(): k for k in known}
    for word in set(re.findall(r"[A-Za-z][A-Za-z\-]{3,}", text)):
        w = word.lower()
        if w in known_l:
            continue
        close = difflib.get_close_matches(w, known_l.keys(), n=1, cutoff=0.75)
        if close:
            warnings.append(f'heard "{word}" - did you mean {known_l[close[0]]}?')
    return warnings
