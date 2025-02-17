import json
import os
import glob
import math
from PIL import Image

# Paths
IMAGE_DIR = "assets_web"  # Adjust path if needed
SPRITE_SIZE = 128  # Each sprite is 128x128
SHEET_SIZE = 6912  # Target sprite sheet size (54x54 grid)
JSON_PATH = "public/items.json"  # Your original JSON file
OUTPUT_JSON = "public/updated_items.json"  # New JSON with sprite mappings

# Load the JSON file
with open(JSON_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

# Get all webp images and create a mapping from PNG paths to WebP paths
image_paths = glob.glob(os.path.join(IMAGE_DIR, "**/*.webp"), recursive=True)
# Create a mapping that converts assets_web paths to match assets paths in JSON
image_map = {}
for path in image_paths:
    # Convert assets_web/media/... to assets/media/...
    json_path = path.replace("assets_web/", "assets/").replace(".webp", ".png")
    image_map[json_path] = path

total_images = len(image_paths)
sprites_per_row = SHEET_SIZE // SPRITE_SIZE
max_sprites = sprites_per_row * sprites_per_row  # 54x54 = 2916 sprites per sheet
num_sheets = math.ceil(total_images / max_sprites)

print(f"Total images: {total_images}")
print(f"Creating {num_sheets} sprite sheets...")

# Image reference mapping for JSON update
new_image_map = {}

# Process images and create sprite sheets
for sheet_index in range(num_sheets):
    sheet = Image.new("RGBA", (SHEET_SIZE, SHEET_SIZE), (0, 0, 0, 0))  # Transparent background

    for i in range(max_sprites):
        img_index = sheet_index * max_sprites + i
        if img_index >= total_images:
            break

        img_path = image_paths[img_index]
        img = Image.open(img_path).convert("RGBA")
        img = img.resize((SPRITE_SIZE, SPRITE_SIZE), Image.Resampling.LANCZOS)

        x = (i % sprites_per_row) * SPRITE_SIZE
        y = (i // sprites_per_row) * SPRITE_SIZE
        sheet.paste(img, (x, y), img)

        # Update image map with sprite sheet coordinates
        rel_path = os.path.relpath(img_path, IMAGE_DIR).replace("\\", "/")  # Normalize for JSON
        json_path = "assets/" + rel_path.replace(".webp", ".png")  # Convert to match JSON paths
        new_image_map[json_path] = {
            "spriteSheet": f"sprite_sheet_{sheet_index+1}.png",
            "x": x,
            "y": y
        }

    sheet.save(f"sprite_sheet_{sheet_index+1}.png", "PNG")
    print(f"Saved sprite_sheet_{sheet_index+1}.png")

# Update JSON references
def update_image_paths(obj):
    if isinstance(obj, dict):
        if "image" in obj and isinstance(obj["image"], str):
            if obj["image"] in new_image_map:
                obj["image"] = new_image_map[obj["image"]]
        for value in obj.values():
            update_image_paths(value)
    elif isinstance(obj, list):
        for item in obj:
            update_image_paths(item)

# Recursively update all image paths in the JSON
update_image_paths(data)

# Save updated JSON
with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print(f"Updated JSON saved to {OUTPUT_JSON}")
print("All sprite sheets and JSON mapping generated successfully!")
