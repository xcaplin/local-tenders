# Sirona Care and Health - Tender Dashboard

A professional web-based dashboard for viewing and tracking tender opportunities from the UK Government's Find a Tender service, specifically filtered for BNSSG (Bristol, North Somerset and South Gloucestershire) related tenders.

## Features

- **Real-time Data**: Fetches tender data from the official Find a Tender OCDS API
- **Smart Filtering**: Automatically filters for active tenders containing the keyword "BNSSG"
- **Local Caching**: Stores tender data locally for fast access and offline viewing
- **Date Range Filtering**: Filter tenders by publication date
- **Multiple Sorting Options**: Sort by publication date, deadline, or title
- **Professional UI**: Clean, healthcare-appropriate design with responsive layout
- **Deadline Tracking**: Visual indicators for urgent deadlines (within 7 days)
- **Detailed Information**: Displays buyer, description, value, and deadline for each tender

## Technology Stack

- **Backend**: Python 3.x with Flask
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **API**: UK Government Find a Tender OCDS API
- **Data Storage**: JSON file-based caching

## Installation

### Prerequisites

- Python 3.7 or higher
- pip (Python package manager)

### Setup Steps

1. **Navigate to the dashboard directory**:
   ```bash
   cd tender-dashboard
   ```

2. **Create a virtual environment** (recommended):
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Application

1. **Start the Flask server**:
   ```bash
   python app.py
   ```

2. **Access the dashboard**:
   Open your web browser and navigate to:
   ```
   http://localhost:5000
   ```

## Usage Guide

### Dashboard Interface

- **Last Updated**: Shows when the tender data was last refreshed
- **Active Tenders**: Displays the total number of BNSSG tenders found
- **Refresh Data**: Click to fetch the latest tenders from the API

### Filtering and Sorting

1. **Date Range Filter**:
   - Use "From Date" and "To Date" to filter tenders by publication date
   - Leave blank to show all tenders

2. **Sort Options**:
   - Publication Date (Newest/Oldest First)
   - Deadline (Soonest/Latest First)
   - Title (Alphabetical)

3. **Clear Filters**: Reset all filters to default settings

### Tender Cards

Each tender card displays:
- **Title**: The tender opportunity name
- **Buyer**: The organization issuing the tender
- **Published Date**: When the tender was published
- **Status**: Current tender status
- **Description**: Brief overview of the tender
- **Value**: Budget or estimated value (if available)
- **Deadline**: Submission deadline with urgency indicator
- **View Tender**: Direct link to the full tender on Find a Tender

### Deadline Indicators

- **Yellow Badge**: Standard deadline
- **Red Badge**: Urgent deadline (within 7 days)

## Data Caching

The application caches tender data locally in `data/tenders_cache.json` to:
- Reduce API calls and improve performance
- Enable offline viewing of previously fetched data
- Provide faster page loads

Cache is automatically refreshed:
- Every 1 hour (configurable in `app.py`)
- When clicking the "Refresh Data" button
- When the cache file doesn't exist

## Configuration

You can customize the application by editing `app.py`:

```python
# Cache duration (default: 1 hour)
CACHE_DURATION = timedelta(hours=1)

# API endpoint
API_ENDPOINT = "https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages"

# Server port (default: 5000)
app.run(debug=True, host='0.0.0.0', port=5000)
```

## Project Structure

```
tender-dashboard/
├── app.py                          # Flask application
├── requirements.txt                # Python dependencies
├── README.md                       # This file
├── data/
│   └── tenders_cache.json         # Cached tender data (auto-generated)
├── static/
│   ├── css/
│   │   └── styles.css             # Dashboard styling
│   └── js/
│       └── dashboard.js           # Frontend functionality
└── templates/
    └── index.html                 # Main dashboard template
```

## API Information

This dashboard uses the UK Government's Find a Tender service OCDS (Open Contracting Data Standard) API:

- **Endpoint**: https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages
- **Format**: JSON (OCDS Release Package)
- **Documentation**: Available at [Find a Tender Service](https://www.find-tender.service.gov.uk/)

## Troubleshooting

### Application won't start
- Ensure Python 3.7+ is installed: `python --version`
- Check all dependencies are installed: `pip install -r requirements.txt`
- Verify port 5000 is not in use by another application

### No tenders displayed
- Check your internet connection
- The API might be temporarily unavailable - cached data will be used if available
- Click "Refresh Data" to force a new API request
- Check browser console for JavaScript errors (F12)

### Slow initial load
- First load fetches data from the API (can take 10-30 seconds)
- Subsequent loads use cached data and are much faster
- Cache refreshes automatically every hour

## Development

### Running in Debug Mode

Debug mode is enabled by default in `app.py`. To disable for production:

```python
app.run(debug=False, host='0.0.0.0', port=5000)
```

### Modifying the Search Keyword

To search for different keywords, edit the `filter_bnssg_tenders()` function in `app.py`:

```python
def filter_bnssg_tenders(releases):
    filtered = []
    keyword = "YOUR_KEYWORD_HERE"  # Change this
    # ... rest of function
```

## Deployment

For production deployment, consider:

1. **Use a production WSGI server** (e.g., Gunicorn):
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```

2. **Set up a reverse proxy** (e.g., Nginx) for better performance and security

3. **Use environment variables** for configuration

4. **Deploy to a cloud platform**:
   - Heroku
   - Railway
   - AWS Elastic Beanstalk
   - Google Cloud Run
   - Azure App Service

## License

This application is developed for Sirona Care and Health for internal use.

## Support

For issues or questions about the dashboard, please contact the development team.

## Acknowledgements

- Data provided by UK Government Find a Tender Service
- Built using Flask web framework
- OCDS (Open Contracting Data Standard) API
