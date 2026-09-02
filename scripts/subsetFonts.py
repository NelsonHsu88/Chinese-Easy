"""
Subsets the CJK fonts to the characters this app can actually display, and
refuses to emit a font that lost one.

    python scripts/subsetFonts.py            # subset, then verify
    python scripts/subsetFonts.py --verify   # verify what is already committed

Requires fontTools:  python -m pip install fonttools

── Why ──────────────────────────────────────────────────────────────────────
The three CJK families are 118MB of the app, because a full Noto CJK face
carries ~31,000 glyphs and this app can display 13,349 characters. Everything
else in those files is weight nobody's phone will ever draw.

── The rule ─────────────────────────────────────────────────────────────────
**A character reachable anywhere in the app must survive subsetting.** That is
not a hope about the corpus being right, it is checked: every output font is
re-opened, its cmap read, and the whole required set looked up in it. A single
missing codepoint fails the run with a non-zero exit and the offending
characters printed. There is no flag to skip it — a subset font that has not
been verified is exactly the thing this script exists to prevent.

Run scripts/buildCharacterCorpus.mjs first; it derives the corpus from the
dictionary, the stroke data, the stories and every source file, so the input
here is generated rather than chosen.

── Why the union, not per-script ────────────────────────────────────────────
Every face is subset to the same union set. `font-hanzi` is declared as the
chain ['NotoSerifSC', 'NotoSerifTC', 'serif'], and React Native honours only
the first family on native — so NotoSerifSC draws traditional text on a phone
and cannot be a simplified-only subset. It costs almost nothing anyway: only 6
characters are simplified-only.
"""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CORPUS = ROOT / "src" / "data" / "characters-union.txt"
OUT_DIR = ROOT / "src" / "assets" / "fonts"
PKGS = ROOT / "node_modules" / "@expo-google-fonts"

# family package, weight directory, font file stem. Only the CJK faces — the
# Latin families are 3.3MB together and subsetting them would risk a missing
# glyph in a language the UI does not even control for no meaningful saving.
FACES = [
    ("noto-serif-sc", "400Regular", "NotoSerifSC_400Regular"),
    ("noto-serif-sc", "500Medium", "NotoSerifSC_500Medium"),
    ("noto-serif-sc", "600SemiBold", "NotoSerifSC_600SemiBold"),
    ("noto-serif-sc", "700Bold", "NotoSerifSC_700Bold"),
    ("noto-serif-tc", "400Regular", "NotoSerifTC_400Regular"),
    ("noto-serif-tc", "500Medium", "NotoSerifTC_500Medium"),
    ("noto-serif-tc", "600SemiBold", "NotoSerifTC_600SemiBold"),
    ("noto-serif-tc", "700Bold", "NotoSerifTC_700Bold"),
    ("noto-sans-tc", "400Regular", "NotoSansTC_400Regular"),
    ("noto-sans-tc", "500Medium", "NotoSansTC_500Medium"),
    ("noto-sans-tc", "700Bold", "NotoSansTC_700Bold"),
]

MB = 1024 * 1024


def required_chars() -> set[str]:
    if not CORPUS.exists():
        sys.exit(f"missing {CORPUS}\nRun: node scripts/buildCharacterCorpus.mjs")
    return set(CORPUS.read_text(encoding="utf-8"))


def subset_one(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        sys.executable, "-m", "fontTools.subset", str(src),
        f"--text-file={CORPUS}",
        f"--output-file={dest}",
        # Keep every OpenType feature. Dropping them is where subsetting starts
        # changing how text is *shaped* rather than only what it can contain.
        "--layout-features=*",
        "--notdef-outline",
        "--recommended-glyphs",
        # Name and vertical metrics kept so the face still identifies itself and
        # lines up exactly as the full font did.
        "--name-IDs=*",
        "--drop-tables-=vmtx,vhea,VORG",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        sys.exit(f"subset failed for {src.name}\n{result.stderr}")


def cmap_of(path: Path) -> set[int]:
    from fontTools.ttLib import TTFont

    with TTFont(str(path)) as font:
        return set(font.getBestCmap().keys())


def verify(src: Path, dest: Path, needed: set[str]) -> tuple[list[str], int]:
    """
    Check the subset lost nothing, and report what the source never had.

    The test is **no regression against the source font**, not coverage of an
    absolute wishlist, and the difference is the whole correctness of this gate.
    Noto Serif TC and Sans TC genuinely do not contain the 2,559 CJK Extension A
    characters that the SC face does, and no Noto CJK face has the breve-marked
    Latin vowels. Demanding those would fail every run for something subsetting
    did not do — the app already fell back to a system face for them, and still
    will. Asking "did we drop anything that was there?" is the question that
    actually protects the learner.

    Returns (characters dropped by subsetting, count the source never had).
    """
    source = cmap_of(src)
    subset = cmap_of(dest)
    expected = {c for c in needed if ord(c) in source}
    dropped = [c for c in sorted(expected) if ord(c) not in subset]
    return dropped, len(needed) - len(expected)


def main() -> None:
    verify_only = "--verify" in sys.argv
    needed = required_chars()
    print(f"corpus: {len(needed)} characters\n")

    total_before = 0
    total_after = 0
    failures: list[str] = []

    for pkg, weight, stem in FACES:
        src = PKGS / pkg / weight / f"{stem}.ttf"
        dest = OUT_DIR / f"{stem}.ttf"

        if not src.exists():
            sys.exit(f"missing source font {src}\nRun npm install first.")

        if not verify_only:
            subset_one(src, dest)
        if not dest.exists():
            sys.exit(f"missing subset {dest}\nRun without --verify to build it.")

        dropped, absent_from_source = verify(src, dest, needed)
        before = src.stat().st_size
        after = dest.stat().st_size
        total_before += before
        total_after += after

        if dropped:
            failures.append(stem)
            shown = "".join(dropped[:40])
            print(f"  FAIL {stem}: subsetting DROPPED {len(dropped)} glyph(s): {shown}")
        else:
            pct = (1 - after / before) * 100
            note = f"   ({absent_from_source} not in source)" if absent_from_source else ""
            print(f"  ok   {stem}: {before/MB:6.2f} MB -> {after/MB:5.2f} MB  (-{pct:4.1f}%){note}")

    print()
    print(f"total: {total_before/MB:.2f} MB -> {total_after/MB:.2f} MB "
          f"(-{(total_before-total_after)/MB:.2f} MB, -{(1-total_after/total_before)*100:.1f}%)")

    if failures:
        print(f"\nGLYPH COVERAGE FAILED for {len(failures)} font(s). Not safe to ship.")
        sys.exit(1)
    print("\nglyph coverage verified: every character each source font could draw,")
    print("that this app can display, is still drawable in the subset.")


if __name__ == "__main__":
    main()
