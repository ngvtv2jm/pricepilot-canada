"""Regenerate PricePine category sharing artwork (Pillow + DejaVu Sans)."""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

CATEGORIES = {
    "bars": "Snack bars", "bread": "Bread & bakery", "butter": "Butter & spreads",
    "candy": "Candy & chocolate", "cereal": "Breakfast cereal", "cheese": "Cheese",
    "chips": "Chips & savoury snacks", "cleaning": "Cleaning supplies", "coffee": "Coffee", "cookies": "Cookies & biscuits",
    "eggs": "Eggs", "fish": "Fish & seafood", "flour": "Flour & baking",
    "frozen-desserts": "Frozen desserts", "juice": "Juice", "meat": "Meat & poultry",
    "milk": "Milk", "nut-spreads": "Nut butters & spreads", "paper": "Paper products",
    "pasta": "Pasta", "rice": "Rice", "sauce": "Sauces & condiments",
    "soft-drinks": "Soft drinks", "soup": "Soup & broth", "tea": "Tea",
    "water": "Water", "yogurt": "Yogurt",
}
ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--fonts", default="/usr/share/fonts/truetype/dejavu")
fonts = Path(parser.parse_args().fonts)
out = ROOT / "public" / "social" / "v1"
out.mkdir(parents=True, exist_ok=True)

def font(size, bold=False):
    return ImageFont.truetype(str(fonts / ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf")), size)

for slug, label in CATEGORIES.items():
    im = Image.new("RGB", (1200, 630), "#0c3b37")
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 1200, 12), fill="#e7bd65")
    for radius in (100, 150, 205, 265, 325):
        d.ellipse((1124-radius, 490-radius, 1124+radius, 490+radius), outline="#216050", width=2)
    d.rounded_rectangle((72, 76, 136, 140), radius=17, fill="#0b5948")
    pts = [(32,9),(18,27),(26,27),(14,42),(26,42),(26,50),(38,50),(38,42),(50,42),(38,27),(46,27)]
    d.polygon([(72+x,76+y) for x,y in pts], fill="#dcf5e6")
    d.rectangle((101, 121, 107, 131), fill="#e7bd65")
    d.text((154, 107), "PricePine Canada", font=font(37, True), fill="#f5faf7", anchor="lm")
    d.text((76, 235), "GROCERY PRICE COMPARISON", font=font(24, True), fill="#e7bd65", anchor="lm")
    size = 94
    while d.textlength(label, font=font(size, True)) > 1025:
        size -= 2
    d.text((70, 328), label, font=font(size, True), fill="#f5faf7", anchor="lm")
    d.text((76, 444), "Compare matching packages and dated retailer prices.", font=font(29), fill="#dcf5e6", anchor="lm")
    d.text((76, 543), "PRICEPINE.CA", font=font(23, True), fill="#e7bd65", anchor="lm")
    im.quantize(colors=48, dither=Image.Dither.NONE).save(out / f"{slug}.png", optimize=True)
