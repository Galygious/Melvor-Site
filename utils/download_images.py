import os
import json
import requests
import concurrent.futures
from urllib.parse import urlparse, urljoin

# Base URL for image downloads
BASE_URL = "https://steam.melvoridle.com/"

# Directory to save images
SAVE_DIR = "./"

# Load the JSON file
with open("items.json", "r", encoding="utf-8") as file:
    data = json.load(file)

# Function to download and save images
def download_image(image_path):
    image_url = urljoin(BASE_URL, image_path)  # Construct full URL
    parsed_url = urlparse(image_url)  # Parse the URL to extract clean filename
    clean_filename = os.path.basename(parsed_url.path)  # Remove query parameters
    local_path = os.path.join(SAVE_DIR, os.path.dirname(image_path), clean_filename)  # Local save path

    os.makedirs(os.path.dirname(local_path), exist_ok=True)  # Create directories if needed

    # Skip if file already exists
    if os.path.exists(local_path):
        print(f"Already exists: {local_path}")
        return

    print(f"Downloading: {image_url}")
    try:
        response = requests.get(image_url, stream=True, timeout=10)
        if response.status_code == 200:
            with open(local_path, "wb") as img_file:
                for chunk in response.iter_content(1024):
                    img_file.write(chunk)
        else:
            print(f"Failed to download: {image_url} (Status Code: {response.status_code})")
    except requests.RequestException as e:
        print(f"Error downloading {image_url}: {e}")

# Extract image paths from JSON
image_paths = []
for category, items in data.items():  # Example: "equipment"
    for item_id, item_data in items.items():  # Example: "melvorD:Bronze_Sword"
        if "image" in item_data:
            image_paths.append(item_data["image"])

# Download images concurrently using ThreadPoolExecutor
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:  # 10 concurrent downloads
    executor.map(download_image, image_paths)

print("✅ All downloads completed.")
