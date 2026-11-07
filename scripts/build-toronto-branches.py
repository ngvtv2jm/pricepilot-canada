"""Build the Toronto pilot from the licensed source snapshots in docs/NEARBY_BRANCHES.md."""
import argparse
import csv
from datetime import date, timedelta
import json
from pathlib import Path
import re

LOCATORS = {
    "No Frills": "https://www.nofrills.ca/en/store-locator",
    "Loblaws": "https://www.loblaws.ca/en/store-locator",
    "Real Canadian Superstore": "https://www.realcanadiansuperstore.ca/en/store-locator",
    "Giant Tiger": "https://stores.gianttiger.com/on/etobicoke/etobicoke-kipling-ave-00168.html",
}
POSTAL = re.compile(r"\b(M\d[A-Z] \d[A-Z]\d)$")


def retailer(name):
    name = name.upper().strip()
    if re.search(r"\bNO\s*FRILLS$", name):
        return "No Frills"
    if name in ("LOBLAWS", "LOBLAWS SUPERMARKET"):
        return "Loblaws"
    return {"GIANT TIGER": "Giant Tiger", "REAL CANADIAN SUPERSTORE": "Real Canadian Superstore"}.get(name)


def branches(csv_path, checked):
    newest = {}
    with csv_path.open(encoding="utf-8-sig", newline="") as file:
        for row in csv.DictReader(file):
            brand = retailer(row["estName"])
            match = POSTAL.search(row["address"])
            if not brand or not match or not row["estId"]:
                continue
            try:
                observed = date.fromisoformat(row["inspectionDate"])
                lat, lon = float(row["latitude"]), float(row["longitude"])
            except ValueError:
                continue
            if not (checked - timedelta(days=365) <= observed <= checked and 43.55 <= lat <= 43.87 and -79.65 <= lon <= -79.10):
                continue
            address = row["address"][:match.start()].replace(" None", "").strip()
            if not address:
                continue
            if brand == "Giant Tiger" and match[1] != "M9W 4K8":
                continue  # The linked retailer page covers the Kipling branch only.
            record = dict(id="dinesafe-" + row["estId"], retailer=brand, address=address, city="Toronto",
                          province="ON", postal=match[1], lat=round(lat, 6), lon=round(lon, 6),
                          locator=LOCATORS[brand], source="Toronto Public Health DineSafe",
                          observed=observed.isoformat(), checked=checked.isoformat())
            key = (address.casefold(), match[1])
            old = newest.get(key)
            if not old or (observed.isoformat(), row["inspectionStatus"] == "Closed") > (old[0]["observed"], old[1]):
                newest[key] = (record, row["inspectionStatus"] == "Closed")
    return sorted((record for record, closed in newest.values() if not closed),
                  key=lambda record: (record["retailer"], record["address"]))


def ring_centroid(ring):
    # Use area-weighted centroids of the simplified cartographic boundaries.
    x0, y0 = ring[0]
    area = x = y = 0.0
    for (ax, ay), (bx, by) in zip(ring, ring[1:]):
        ax, ay, bx, by = ax - x0, ay - y0, bx - x0, by - y0
        cross = ax * by - bx * ay
        area += cross
        x += (ax + bx) * cross
        y += (ay + by) * cross
    return (abs(area), x0 + x / (3 * area), y0 + y / (3 * area)) if area else (0, x0, y0)


def centroids(geojson):
    result = {}
    for feature in json.loads(geojson.read_text())["features"]:
        geometry = feature["geometry"]
        polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
        components = []
        for polygon in polygons:
            for index, ring in enumerate(polygon):
                area, lon, lat = ring_centroid(ring)
                components.append((area if index == 0 else -area, lon, lat))
        area = sum(weight for weight, _, _ in components)
        if area:
            lat = sum(weight * lat for weight, _, lat in components) / area
            lon = sum(weight * lon for weight, lon, _ in components) / area
            result[feature["properties"]["CFSAUID"]] = [round(lat, 5), round(lon, 5)]
    return dict(sorted(result.items()))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("dinesafe_csv", type=Path)
    parser.add_argument("statcan_geojson", type=Path)
    parser.add_argument("--checked", type=date.fromisoformat, required=True)
    args = parser.parse_args()
    stores, centres = branches(args.dinesafe_csv, args.checked), centroids(args.statcan_geojson)
    if len(stores) < 10 or "M5V" not in centres:
        raise SystemExit("Source incomplete. Keep the existing directory.")
    directory = dict(version=1, checked=args.checked.isoformat(), centres=centres, branches=stores)
    out = Path(__file__).resolve().parents[1] / "public" / "toronto-branches.json"
    out.write_text(json.dumps(directory, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"{len(stores)} branch addresses and {len(centres)} census postal-area centroids.")


if __name__ == "__main__":
    main()
