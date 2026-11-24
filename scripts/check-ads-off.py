"""Check for unintended AdSense delivery signals in an ads-off deployment."""
import argparse
import pathlib
import re

ACTIVE_MARKERS = re.compile(
    r"(?:pagead2\.googlesyndication\.com|googleads\.g\.doubleclick\.net|"
    r"fundingchoicesmessages\.google\.com|adsbygoogle|google_ad_client)",
    re.IGNORECASE,
)
GOOGLE_SELLER = re.compile(r"^\s*google\.com\s*,", re.IGNORECASE | re.MULTILINE)

def check(dist: pathlib.Path, allow_google_seller: str | None = None) -> list[str]:
    if not (dist / "index.html").is_file():
        return ["missing deployable index.html"]
    problems = []
    for path in sorted(dist.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in {".html", ".htm", ".js", ".mjs"}:
            continue
        text = path.read_text(encoding="utf-8")
        if ACTIVE_MARKERS.search(text):
            problems.append(f"{path.relative_to(dist)}: Google ad delivery marker")
    sellers = dist / "ads.txt"
    if not sellers.is_file():
        problems.append("missing ads.txt")
    elif allow_google_seller is not None:
        expected = f"google.com, {allow_google_seller}, DIRECT, f08c47fec0942fa0"
        if not re.fullmatch(r"pub-\d{16}", allow_google_seller) or sellers.read_text(encoding="utf-8").splitlines() != [expected]:
            problems.append("ads.txt: does not match the exact authorized Google seller record")
    elif GOOGLE_SELLER.search(sellers.read_text(encoding="utf-8")):
        problems.append("ads.txt: Google seller record")
    return problems

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dist", type=pathlib.Path)
    parser.add_argument("--allow-google-seller", help="Exact authorized pub- ID; ad code is still forbidden")
    args = parser.parse_args()
    problems = check(args.dist, args.allow_google_seller)
    if problems:
        print("\n".join(problems))
        return 1
    print("Ads-off check passed: no Google ad delivery markers; seller record matches configuration.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
