#!/usr/bin/env python3
"""Generate app icons from SVG using Pillow + HTML rendering fallback."""
import subprocess
import os
import shutil
import tempfile

SVG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icon.svg")
OUT = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")

sizes = [1024, 512, 192, 180, 167, 152, 120, 87, 80, 76, 60, 58, 40, 29, 20]

# Use qlmanage (macOS built-in) to render SVG, then sips to resize
# First render at max size
tmp = tempfile.mkdtemp()
subprocess.run(["qlmanage", "-t", "-s", "1024", "-o", tmp, SVG], capture_output=True)

# Find the output file
rendered = None
for f in os.listdir(tmp):
    if f.endswith(".png"):
        rendered = os.path.join(tmp, f)
        break

if not rendered:
    print("qlmanage failed, trying alternative...")
    # Create a simple PNG programmatically with Pillow
    from PIL import Image, ImageDraw, ImageFont

    for s in sizes:
        img = Image.new('RGB', (s, s), color=(14, 17, 13))
        draw = ImageDraw.Draw(img)

        # Draw the W
        margin = s * 0.22
        mid = s / 2
        top = s * 0.28
        bot = s * 0.72
        mid_y = s * 0.58

        # W shape points
        w_points = [
            (margin, top),
            (margin + s*0.1, top),
            (margin + s*0.19, mid_y),
            (mid, top + s*0.09),
            (s - margin - s*0.19, mid_y),
            (s - margin - s*0.1, top),
            (s - margin, top),
            (s - margin - s*0.14, bot),
            (s - margin - s*0.23, bot),
            (mid, mid_y + s*0.03),
            (margin + s*0.23, bot),
            (margin + s*0.14, bot),
        ]

        # Green gradient simulation — draw multiple slightly offset W shapes
        for offset in range(3):
            color_val = 138 + offset * 20
            color = (90 + offset*15, color_val, 79 + offset*15)
            draw.polygon(w_points, fill=color)

        # Final W with main green
        draw.polygon(w_points, fill=(138, 171, 127))

        out_path = os.path.join(OUT, f"icon-{s}.png")
        img.save(out_path, "PNG")
        print(f"Generated {out_path}")
else:
    # Resize the rendered SVG to all sizes
    from PIL import Image
    base = Image.open(rendered)

    for s in sizes:
        resized = base.resize((s, s), Image.LANCZOS)
        out_path = os.path.join(OUT, f"icon-{s}.png")
        resized.save(out_path, "PNG")
        print(f"Generated {out_path}")

# Cleanup
shutil.rmtree(tmp, ignore_errors=True)

# Copy key sizes to public/
for s in [192, 512]:
    src = os.path.join(OUT, f"icon-{s}.png")
    if os.path.exists(src):
        shutil.copy2(src, os.path.join(PUBLIC, f"icon-{s}.png"))
        print(f"Copied icon-{s}.png to public/")
