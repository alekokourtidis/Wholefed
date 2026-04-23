#!/usr/bin/env python3
"""Upload App Store screenshots via App Store Connect API"""

import jwt
import time
import json
import os
import sys
import hashlib
import base64
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ISSUER_ID = "6751e8f7-ce85-4055-b808-f5874cb69789"
KEY_ID = "M4MFFLW57K"
KEY_FILE = os.path.expanduser("~/Downloads/AuthKey_M4MFFLW57K.p8")
BUNDLE_ID = "com.wholefed.app"
SCREENSHOT_DIR = os.path.expanduser("~/Downloads/screenshots_final")

# Display type for 6.5" iPhone
DISPLAY_TYPE = "APP_IPHONE_65"

def make_token():
    with open(KEY_FILE, "r") as f:
        private_key = f.read()

    now = int(time.time())
    payload = {
        "iss": ISSUER_ID,
        "iat": now,
        "exp": now + 1200,
        "aud": "appstoreconnect-v1",
    }
    return jwt.encode(payload, private_key, algorithm="ES256", headers={"kid": KEY_ID})

def api_request(method, url, data=None):
    token = make_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    body = json.dumps(data).encode() if data else None
    req = Request(url, data=body, headers=headers, method=method)

    try:
        with urlopen(req) as resp:
            if resp.status == 204:
                return None
            return json.loads(resp.read())
    except HTTPError as e:
        error_body = e.read().decode()
        print(f"  API Error {e.code}: {error_body[:500]}")
        raise

def upload_file(upload_url, file_path):
    """Upload file to Apple's asset upload endpoint"""
    with open(file_path, "rb") as f:
        file_data = f.read()

    headers = {
        "Content-Type": "image/png" if file_path.endswith(".png") else "image/jpeg",
    }

    req = Request(upload_url, data=file_data, headers=headers, method="PUT")
    try:
        with urlopen(req) as resp:
            return resp.status
    except HTTPError as e:
        print(f"  Upload Error {e.code}: {e.read().decode()[:300]}")
        raise

# Step 1: Find the app
print("Finding app...")
resp = api_request("GET", f"https://api.appstoreconnect.apple.com/v1/apps?filter[bundleId]={BUNDLE_ID}")
app_id = resp["data"][0]["id"]
app_name = resp["data"][0]["attributes"]["name"]
print(f"  Found: {app_name} (ID: {app_id})")

# Step 2: Get the app store version
print("\nFinding app store version...")
resp = api_request("GET", f"https://api.appstoreconnect.apple.com/v1/apps/{app_id}/appStoreVersions?filter[appStoreState]=PREPARE_FOR_SUBMISSION")

version = resp["data"][0]
version_id = version["id"]
version_string = version["attributes"]["versionString"]
print(f"  Version: {version_string} (ID: {version_id})")

# Step 3: Get localizations
print("\nFinding localizations...")
resp = api_request("GET", f"https://api.appstoreconnect.apple.com/v1/appStoreVersions/{version_id}/appStoreVersionLocalizations")
localization = resp["data"][0]
loc_id = localization["id"]
locale = localization["attributes"]["locale"]
print(f"  Locale: {locale} (ID: {loc_id})")

# Step 4: Get existing screenshot sets
print("\nFinding screenshot sets...")
resp = api_request("GET", f"https://api.appstoreconnect.apple.com/v1/appStoreVersionLocalizations/{loc_id}/appScreenshotSets")

target_set = None
for ss_set in resp["data"]:
    display = ss_set["attributes"]["screenshotDisplayType"]
    print(f"  Found set: {display} (ID: {ss_set['id']})")
    if display == DISPLAY_TYPE:
        target_set = ss_set

# Step 5: Delete existing screenshots in the target set
if target_set:
    print(f"\nDeleting existing screenshots from {DISPLAY_TYPE}...")
    screenshots_resp = api_request("GET", f"https://api.appstoreconnect.apple.com/v1/appScreenshotSets/{target_set['id']}/appScreenshots")
    for ss in screenshots_resp["data"]:
        ss_id = ss["id"]
        state = ss["attributes"].get("assetDeliveryState", {}).get("state", "unknown")
        print(f"  Deleting screenshot {ss_id} (state: {state})...")
        try:
            api_request("DELETE", f"https://api.appstoreconnect.apple.com/v1/appScreenshots/{ss_id}")
            print(f"    Deleted!")
        except Exception as e:
            print(f"    Failed to delete: {e}")

    set_id = target_set["id"]
    print(f"\n  Using existing set: {set_id}")
else:
    # Create new screenshot set
    print(f"\nCreating screenshot set for {DISPLAY_TYPE}...")
    data = {
        "data": {
            "type": "appScreenshotSets",
            "attributes": {
                "screenshotDisplayType": DISPLAY_TYPE,
            },
            "relationships": {
                "appStoreVersionLocalization": {
                    "data": {"type": "appStoreVersionLocalizations", "id": loc_id}
                }
            }
        }
    }
    resp = api_request("POST", "https://api.appstoreconnect.apple.com/v1/appScreenshotSets", data)
    set_id = resp["data"]["id"]
    print(f"  Created set: {set_id}")

# Step 6: Upload new screenshots
print(f"\nUploading screenshots...")
screenshots = sorted([f for f in os.listdir(SCREENSHOT_DIR) if f.endswith((".png", ".jpg", ".jpeg"))])
print(f"  Found {len(screenshots)} files to upload")

for i, filename in enumerate(screenshots):
    filepath = os.path.join(SCREENSHOT_DIR, filename)
    filesize = os.path.getsize(filepath)

    print(f"\n  [{i+1}/{len(screenshots)}] {filename} ({filesize} bytes)")

    # Calculate checksum
    with open(filepath, "rb") as f:
        file_data = f.read()
    checksum = hashlib.md5(file_data).hexdigest()

    # Reserve the screenshot
    print(f"    Reserving...")
    data = {
        "data": {
            "type": "appScreenshots",
            "attributes": {
                "fileName": filename,
                "fileSize": filesize,
            },
            "relationships": {
                "appScreenshotSet": {
                    "data": {"type": "appScreenshotSets", "id": set_id}
                }
            }
        }
    }

    try:
        resp = api_request("POST", "https://api.appstoreconnect.apple.com/v1/appScreenshots", data)
    except Exception as e:
        print(f"    Failed to reserve: {e}")
        continue

    ss_id = resp["data"]["id"]
    upload_ops = resp["data"]["attributes"]["uploadOperations"]
    print(f"    Reserved: {ss_id}")
    print(f"    Upload operations: {len(upload_ops)}")

    # Upload each part
    for j, op in enumerate(upload_ops):
        url = op["url"]
        offset = op["offset"]
        length = op["length"]
        method = op["method"]
        req_headers = {h["name"]: h["value"] for h in op["requestHeaders"]}

        chunk = file_data[offset:offset + length]
        print(f"    Uploading part {j+1}/{len(upload_ops)} ({length} bytes)...")

        req = Request(url, data=chunk, headers=req_headers, method=method)
        try:
            with urlopen(req) as resp_upload:
                print(f"      Done (status {resp_upload.status})")
        except HTTPError as e:
            print(f"      Error: {e.code} {e.read().decode()[:200]}")

    # Commit the upload
    print(f"    Committing...")
    commit_data = {
        "data": {
            "type": "appScreenshots",
            "id": ss_id,
            "attributes": {
                "uploaded": True,
                "sourceFileChecksum": checksum,
            }
        }
    }

    try:
        api_request("PATCH", f"https://api.appstoreconnect.apple.com/v1/appScreenshots/{ss_id}", commit_data)
        print(f"    Committed!")
    except Exception as e:
        print(f"    Commit failed: {e}")

print("\n\nDone! Check App Store Connect.")
