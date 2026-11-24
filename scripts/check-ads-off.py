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

def check(dist: pathlib.Path) -> list[str]:
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
    elif GOOGLE_SELLER.search(sellers.read_text(encoding="utf-8")):
        problems.append("ads.txt: Google seller record")
    return problems

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dist", type=pathlib.Path)
    problems = check(parser.parse_args().dist)
    if problems:
        print("\n".join(problems))
        return 1
    print("Ads-off check passed: no Google delivery markers or seller record.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
