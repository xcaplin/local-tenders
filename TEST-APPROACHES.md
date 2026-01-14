# API Approach Testing

This repository includes a test page to evaluate different approaches for fetching tender data while avoiding CORS issues.

## Test Page

**URL:** https://xcaplin.github.io/local-tenders/test-approaches.html

## Approaches Being Tested

### 1. CORS Proxy Services ✅ Recommended
Uses third-party CORS proxy services to bypass browser restrictions.

**Proxies tested:**
- `corsproxy.io` - Fast and reliable
- `allorigins.win` - Popular service
- `cors.sh` - New service

**Pros:**
- Quick to implement
- Works immediately
- No backend required

**Cons:**
- Depends on external services
- May have rate limits
- Could be blocked or go down

### 2. Pre-fetched Data via GitHub Actions 🔄 Experimental
GitHub Actions fetches data every 6 hours and commits it as a JSON file.

**How it works:**
1. GitHub Action runs on schedule (every 6 hours)
2. Fetches latest tender data from API
3. Commits `cached-tenders.json` to repository
4. App loads from this static file

**Pros:**
- No CORS issues
- Fast page loads
- Reliable (no external dependencies)
- Works even if API is down

**Cons:**
- Data may be up to 6 hours stale
- Requires GitHub Actions setup
- Increases repository size slightly

### 3. Direct API Call 🔍 Baseline
Direct call to Find a Tender API without any proxy.

**Purpose:**
- Confirms that CORS is the actual blocker
- Baseline for comparison
- Expected to fail in browser

## How to Use

1. Visit the test page: https://xcaplin.github.io/local-tenders/test-approaches.html
2. Click "Test All Approaches" or test individually
3. Review results to see which approach works
4. Implement the working approach in the main app

## GitHub Action Setup

The pre-fetched data approach requires the GitHub Action to be enabled:

1. The workflow file is at `.github/workflows/fetch-tenders.yml`
2. It runs automatically every 6 hours
3. Can also be triggered manually from GitHub Actions tab
4. Requires write permissions (already configured)

## Recommendation

Based on testing:
- If CORS proxies work: Use them for real-time data
- If proxies are unreliable: Enable pre-fetched data approach
- Consider hybrid: Pre-fetched as fallback when proxy fails
