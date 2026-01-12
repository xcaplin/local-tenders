"""
Sirona Care and Health - Tender Dashboard
Flask application for viewing UK government tender opportunities
"""

from flask import Flask, render_template, jsonify, request
import requests
import json
from datetime import datetime, timedelta
import os
from pathlib import Path

app = Flask(__name__)

# Configuration
API_ENDPOINT = "https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages"
DATA_DIR = Path(__file__).parent / "data"
CACHE_FILE = DATA_DIR / "tenders_cache.json"
CACHE_DURATION = timedelta(hours=1)  # Refresh data every hour

# Ensure data directory exists
DATA_DIR.mkdir(exist_ok=True)


def search_text_for_keyword(text, keyword):
    """Case-insensitive search for keyword in text"""
    if not text:
        return False
    return keyword.lower() in str(text).lower()


def search_nested_dict(obj, keyword):
    """Recursively search for keyword in nested dictionary/list structures"""
    if isinstance(obj, dict):
        for key, value in obj.items():
            if search_text_for_keyword(key, keyword) or search_text_for_keyword(value, keyword):
                return True
            if isinstance(value, (dict, list)):
                if search_nested_dict(value, keyword):
                    return True
    elif isinstance(obj, list):
        for item in obj:
            if search_nested_dict(item, keyword):
                return True
    else:
        if search_text_for_keyword(obj, keyword):
            return True
    return False


def fetch_tenders_from_api():
    """Fetch tender data from Find a Tender API"""
    try:
        print("Fetching tenders from API...")
        response = requests.get(API_ENDPOINT, timeout=30)
        response.raise_for_status()
        data = response.json()

        return data
    except requests.exceptions.RequestException as e:
        print(f"Error fetching from API: {e}")
        return None


def filter_bnssg_tenders(releases):
    """Filter releases for BNSSG keyword and tender stage"""
    filtered = []
    keyword = "BNSSG"

    for release in releases:
        # Check if this is an active tender
        if release.get('tag') and 'tender' in release.get('tag', []):
            # Search entire release for BNSSG keyword
            if search_nested_dict(release, keyword):
                filtered.append(release)

    return filtered


def extract_tender_info(release):
    """Extract relevant information from a tender release"""
    tender_data = release.get('tender', {})
    parties = release.get('parties', [])

    # Find buyer organization
    buyer_name = "Unknown"
    for party in parties:
        if 'buyer' in party.get('roles', []):
            buyer_name = party.get('name', 'Unknown')
            break

    # Extract tender period
    tender_period = tender_data.get('tenderPeriod', {})
    deadline = tender_period.get('endDate', 'Not specified')

    # Extract value
    value_data = tender_data.get('value', {})
    value = None
    if value_data:
        amount = value_data.get('amount')
        currency = value_data.get('currency', 'GBP')
        if amount:
            value = f"{currency} {amount:,.2f}"

    # Get document links
    documents = tender_data.get('documents', [])
    tender_url = None
    for doc in documents:
        if doc.get('url'):
            tender_url = doc.get('url')
            break

    # If no document URL, try to construct Find a Tender URL
    if not tender_url:
        ocid = release.get('ocid', '')
        if ocid:
            tender_url = f"https://www.find-tender.service.gov.uk/Notice/{ocid}"

    return {
        'id': release.get('id', ''),
        'ocid': release.get('ocid', ''),
        'title': tender_data.get('title', 'Untitled'),
        'description': tender_data.get('description', 'No description available'),
        'buyer': buyer_name,
        'deadline': deadline,
        'value': value,
        'url': tender_url,
        'date': release.get('date', ''),
        'status': tender_data.get('status', 'Unknown')
    }


def load_cached_data():
    """Load tender data from cache file"""
    if not CACHE_FILE.exists():
        return None, None

    try:
        with open(CACHE_FILE, 'r') as f:
            cache = json.load(f)
            last_updated = datetime.fromisoformat(cache['last_updated'])
            return cache['tenders'], last_updated
    except Exception as e:
        print(f"Error loading cache: {e}")
        return None, None


def save_cached_data(tenders):
    """Save tender data to cache file"""
    cache = {
        'last_updated': datetime.now().isoformat(),
        'tenders': tenders
    }
    try:
        with open(CACHE_FILE, 'w') as f:
            json.dump(cache, f, indent=2)
    except Exception as e:
        print(f"Error saving cache: {e}")


def get_tenders(force_refresh=False):
    """Get tender data from cache or API"""
    # Check cache first
    if not force_refresh:
        cached_tenders, last_updated = load_cached_data()
        if cached_tenders and last_updated:
            # Check if cache is still valid
            if datetime.now() - last_updated < CACHE_DURATION:
                print("Using cached data")
                return cached_tenders, last_updated

    # Fetch from API
    print("Fetching fresh data from API...")
    api_data = fetch_tenders_from_api()

    if not api_data:
        # If API fails, return cached data if available
        print("API fetch failed, falling back to cache")
        cached_tenders, last_updated = load_cached_data()
        if cached_tenders:
            return cached_tenders, last_updated
        return [], None

    # Process releases
    releases = api_data.get('releases', [])
    filtered_releases = filter_bnssg_tenders(releases)

    # Extract tender information
    tenders = [extract_tender_info(release) for release in filtered_releases]

    # Save to cache
    save_cached_data(tenders)

    return tenders, datetime.now()


@app.route('/')
def index():
    """Render the main dashboard page"""
    return render_template('index.html')


@app.route('/api/tenders')
def api_tenders():
    """API endpoint to get tender data"""
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'

    tenders, last_updated = get_tenders(force_refresh=force_refresh)

    return jsonify({
        'tenders': tenders,
        'last_updated': last_updated.isoformat() if last_updated else None,
        'count': len(tenders)
    })


@app.route('/api/refresh')
def api_refresh():
    """Force refresh tender data from API"""
    tenders, last_updated = get_tenders(force_refresh=True)

    return jsonify({
        'success': True,
        'tenders': tenders,
        'last_updated': last_updated.isoformat() if last_updated else None,
        'count': len(tenders)
    })


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
