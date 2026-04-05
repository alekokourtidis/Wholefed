#!/usr/bin/env python3
"""Add iPhone bezel frame around simulator screenshots for App Store."""
from PIL import Image, ImageDraw, ImageFont
import os, sys

def add_bezel(screenshot_path, caption, output_path):
    # Load screenshot
    screen = Image.open(screenshot_path).convert("RGBA")
    sw, sh = screen.size

    # Target: App Store 6.5" = 1242 x 2688 or 1290 x 2796
    # We'll create 1290 x 2796
    canvas_w, canvas_h = 1290, 2796

    # Phone frame dimensions
    phone_w = int(canvas_w * 0.82)
    phone_h = int(phone_w * (sh / sw) + phone_w * 0.08)  # extra for top/bottom bezels

    # Resize screenshot to fit inside phone
    inner_w = int(phone_w * 0.92)
    inner_h = int(inner_w * (sh / sw))
    screen_resized = screen.resize((inner_w, inner_h), Image.LANCZOS)

    # Create canvas with dark background
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (13, 13, 13, 255))
    draw = ImageDraw.Draw(canvas)

    # Phone position (centered horizontally, lower portion)
    phone_x = (canvas_w - phone_w) // 2
    phone_y = canvas_h - phone_h - int(canvas_h * 0.06)

    # Draw phone frame (rounded rectangle)
    corner_r = int(phone_w * 0.1)
    # Phone body
    draw.rounded_rectangle(
        [phone_x, phone_y, phone_x + phone_w, phone_y + phone_h],
        radius=corner_r,
        fill=(30, 30, 30, 255),
        outline=(60, 60, 60, 255),
        width=2
    )

    # Screen area (slightly inset)
    screen_x = phone_x + (phone_w - inner_w) // 2
    screen_y = phone_y + (phone_h - inner_h) // 2

    # Paste screenshot
    canvas.paste(screen_resized, (screen_x, screen_y))

    # Draw screen border (subtle)
    screen_corner_r = int(corner_r * 0.7)
    draw.rounded_rectangle(
        [screen_x - 1, screen_y - 1, screen_x + inner_w + 1, screen_y + inner_h + 1],
        radius=screen_corner_r,
        fill=None,
        outline=(40, 40, 40, 255),
        width=1
    )

    # Add caption text at top
    # Try to use a nice font
    font_size = 72
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except:
        try:
            font = ImageFont.truetype("/System/Library/Fonts/SFCompact.ttf", font_size)
        except:
            font = ImageFont.load_default()

    # Caption position
    text_bbox = draw.textbbox((0, 0), caption, font=font)
    text_w = text_bbox[2] - text_bbox[0]
    text_x = (canvas_w - text_w) // 2
    text_y = int(canvas_h * 0.08)

    # Draw caption
    draw.text((text_x, text_y), caption, fill=(212, 207, 196, 255), font=font)

    # Save as RGB (no alpha for App Store)
    canvas.convert("RGB").save(output_path, "PNG", quality=95)
    print(f"Created: {output_path}")

# Screenshots and captions
screenshots = [
    ("Simulator Screenshot - iPhone 17 Pro - 2026-04-05 at 03.17.55.png", "Score Any Meal\nInstantly"),
    ("Simulator Screenshot - iPhone 17 Pro - 2026-04-05 at 03.16.32.png", "Honest Scores.\nNo Sugarcoating."),
    ("Simulator Screenshot - iPhone 17 Pro - 2026-04-05 at 03.18.00.png", "Insights Based\nOn Your Body"),
    ("Simulator Screenshot - iPhone 17 Pro - 2026-04-05 at 02.51.51.png", "Upload Bloodwork.\nGet Personal."),
    ("Simulator Screenshot - iPhone 17 Pro - 2026-04-05 at 02.49.03.png", "Track Every\nMeal You Eat"),
    ("Simulator Screenshot - iPhone 17 Pro - 2026-04-05 at 02.49.12.png", "Snap. Score.\nKnow."),
]

desktop = os.path.expanduser("~/Desktop")
out_dir = os.path.expanduser("~/wholefed/brand/appstore-screenshots")
os.makedirs(out_dir, exist_ok=True)

for i, (filename, caption) in enumerate(screenshots):
    path = os.path.join(desktop, filename)
    if os.path.exists(path):
        add_bezel(path, caption, os.path.join(out_dir, f"appstore-{i+1}.png"))
    else:
        print(f"Not found: {filename}")
