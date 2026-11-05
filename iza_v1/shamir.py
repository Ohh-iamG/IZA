"""
Shamir secret sharing over GF(256) - used to split the vault master key into
recovery shares (default: any 2 of 3 rebuild it; any 1 alone reveals nothing).

Share format (text, easy to print or write down):
    IZA1-<k>-<x>-<hex payload>-<checksum>
"""

from __future__ import annotations

import hashlib
import secrets as _rng

# log/antilog tables for GF(2^8) with the AES polynomial x^8+x^4+x^3+x+1, generator 3
_EXP = [0] * 512
_LOG = [0] * 256
_v = 1
for _i in range(255):
    _EXP[_i] = _v
    _LOG[_v] = _i
    _v ^= (_v << 1) ^ (0x11B if _v & 0x80 else 0)  # multiply by 3
    _v &= 0xFF
for _i in range(255, 512):
    _EXP[_i] = _EXP[_i - 255]


def _mul(a: int, b: int) -> int:
    if a == 0 or b == 0:
        return 0
    return _EXP[_LOG[a] + _LOG[b]]


def _div(a: int, b: int) -> int:
    if b == 0:
        raise ZeroDivisionError
    if a == 0:
        return 0
    return _EXP[(_LOG[a] - _LOG[b]) % 255]


def _eval(coeffs: list[int], x: int) -> int:
    acc = 0
    for c in reversed(coeffs):
        acc = _mul(acc, x) ^ c
    return acc


def _checksum(body: str) -> str:
    return hashlib.sha256(body.encode()).hexdigest()[:6]


def split(secret: bytes, k: int = 2, n: int = 3) -> list[str]:
    if not 2 <= k <= n <= 255:
        raise ValueError("need 2 <= k <= n <= 255")
    columns = []
    for byte in secret:
        coeffs = [byte] + [_rng.randbelow(256) for _ in range(k - 1)]
        columns.append([_eval(coeffs, x) for x in range(1, n + 1)])
    shares = []
    for idx in range(n):
        x = idx + 1
        payload = bytes(col[idx] for col in columns).hex()
        body = f"IZA1-{k}-{x}-{payload}"
        shares.append(f"{body}-{_checksum(body)}")
    return shares


def parse(share: str) -> tuple[int, int, bytes]:
    share = "".join(share.split())  # tolerate spaces / line breaks when retyped
    parts = share.split("-")
    if len(parts) != 5 or parts[0] != "IZA1":
        raise ValueError("not an IZA recovery share")
    body = "-".join(parts[:4])
    if _checksum(body) != parts[4]:
        raise ValueError("share checksum failed - check for a typo")
    return int(parts[1]), int(parts[2]), bytes.fromhex(parts[3])


def combine(shares: list[str]) -> bytes:
    parsed = [parse(s) for s in shares]
    k = parsed[0][0]
    xs = {x for _, x, _ in parsed}
    if len(xs) != len(parsed):
        raise ValueError("duplicate share")
    if len(parsed) < k:
        raise ValueError(f"need {k} shares, got {len(parsed)}")
    parsed = parsed[:k]
    length = len(parsed[0][2])
    if any(len(p[2]) != length for p in parsed):
        raise ValueError("shares are from different splits")
    out = bytearray()
    for i in range(length):
        acc = 0
        for j, (_, xj, yj) in enumerate(parsed):
            num, den = 1, 1
            for m, (_, xm, _) in enumerate(parsed):
                if m != j:
                    num = _mul(num, xm)
                    den = _mul(den, xm ^ xj)
            acc ^= _mul(yj[i], _div(num, den))
        out.append(acc)
    return bytes(out)
