import json
import os
import glob
from PIL import Image
import concurrent.futures
from threading import Lock
import multiprocessing
import time

# Paths
IMAGE_DIR = "assets_web"  # Source directory
SCALED_DIR = "public/scaled"  # New directory for scaled images in public folder
SPRITE_SIZE = 128  # Target size for scaled images
JSON_PATH = "public/items.json"  # Your original JSON file
OUTPUT_JSON = "public/updated_items.json"  # New JSON with scaled image paths

# Create scaled directory if it doesn't exist
os.makedirs(SCALED_DIR, exist_ok=True)
print(f"Scaled images will be saved to: {SCALED_DIR}")
print(f"Original images will be preserved in: {IMAGE_DIR}")

# Thread-safe counter and map
processed_count = 0
count_lock = Lock()
new_image_map = {}
map_lock = Lock()

def process_image(img_path):
    global processed_count
    try:
        # Open and scale image
        img = Image.open(img_path).convert("RGBA")
        img = img.resize((SPRITE_SIZE, SPRITE_SIZE), Image.Resampling.LANCZOS)
        
        # Create the same directory structure in scaled directory
        rel_path = os.path.relpath(img_path, IMAGE_DIR).replace("\\", "/")
        scaled_path = os.path.join(SCALED_DIR, rel_path)
        os.makedirs(os.path.dirname(scaled_path), exist_ok=True)
        
        # Save scaled image to new location
        img.save(scaled_path, "WEBP", quality=90)

        # Update image map with scaled webp path
        json_path = "assets/" + rel_path.replace(".webp", ".png")  # Convert to match JSON paths
        
        # Thread-safe map update
        with map_lock:
            # Use web-accessible path format
            new_image_map[json_path] = "scaled/" + rel_path
        
        # Thread-safe counter update
        with count_lock:
            global processed_count
            processed_count += 1
            if processed_count % 10 == 0:  # Print progress every 10 images
                print(f"Processed {processed_count} images...")
        
        return True
    except Exception as e:
        print(f"Error processing {img_path}: {str(e)}")
        return False

# Load the JSON file
with open(JSON_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

# Get all webp images
image_paths = glob.glob(os.path.join(IMAGE_DIR, "**/*.webp"), recursive=True)
total_images = len(image_paths)
start_time = time.time()
print(f"Total images to process: {total_images}")
print(f"Scaled images will be saved to: {SCALED_DIR}")
print(f"Original images will be preserved in: {IMAGE_DIR}")

# Process images in parallel
max_workers = min(32, multiprocessing.cpu_count() * 4)  # Limit max threads
print(f"Using {max_workers} worker threads")

with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
    futures = [executor.submit(process_image, path) for path in image_paths]
    concurrent.futures.wait(futures)

# Update JSON references
def clean_image_path(path):
    # Remove PHP query parameters if present
    return path.split('?')[0] if '?' in path else path

def update_image_paths(obj):
    if isinstance(obj, dict):
        if "image" in obj and isinstance(obj["image"], str):
            clean_path = clean_image_path(obj["image"])
            if clean_path in new_image_map:
                # Replace with path to scaled webp image
                obj["image"] = new_image_map[clean_path]
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

end_time = time.time()
print(f"Updated JSON saved to {OUTPUT_JSON}")
print(f"All images scaled and saved to {SCALED_DIR}")
print(f"Original images preserved in {IMAGE_DIR}")
print(f"Process completed in {end_time - start_time:.2f} seconds!")
