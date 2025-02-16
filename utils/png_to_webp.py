import os
import multiprocessing
from PIL import Image

# Input and output directories
SOURCE_DIR = "assets"
DEST_DIR = "assets_web"

def process_image(task):
    """ Converts a single PNG file to WebP and saves it in the correct directory. """
    input_path, output_path = task
    try:
        with Image.open(input_path) as img:
            img.save(output_path, "WEBP", quality=80)
        print(f"✔ Converted: {input_path} → {output_path}")
    except Exception as e:
        print(f"❌ Failed: {input_path}, Error: {e}")

def collect_tasks(source_dir, dest_dir):
    """ Walks through directories and collects PNG conversion tasks. """
    tasks = []
    for root, _, files in os.walk(source_dir):
        relative_path = os.path.relpath(root, source_dir)
        output_folder = os.path.join(dest_dir, relative_path)
        os.makedirs(output_folder, exist_ok=True)

        for file in files:
            if file.lower().endswith(".png"):
                input_path = os.path.join(root, file)
                output_path = os.path.join(output_folder, file.rsplit(".", 1)[0] + ".webp")
                tasks.append((input_path, output_path))

    return tasks

def convert_images_multithreaded(source_dir, dest_dir, num_workers=None):
    """ Uses multiprocessing to speed up PNG → WebP conversion. """
    tasks = collect_tasks(source_dir, dest_dir)

    # Auto-detect CPU cores if not set
    if num_workers is None:
        num_workers = max(1, multiprocessing.cpu_count() - 1)

    print(f"🔄 Processing {len(tasks)} images using {num_workers} worker(s)...")

    # Run the conversion in parallel
    with multiprocessing.Pool(num_workers) as pool:
        pool.map(process_image, tasks)

    print("\n✅ Conversion complete! Check the 'assets_web' folder.")

if __name__ == "__main__":
    convert_images_multithreaded(SOURCE_DIR, DEST_DIR)
