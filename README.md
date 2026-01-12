# Local Tenders

A comprehensive tender opportunity tracking system for Sirona Care and Health.

This repository contains two applications:
1. **Tender Dashboard** - A Flask-based web application for tracking BNSSG tender opportunities
2. **React Web App** - A modern React application for GitHub Pages deployment

## 📊 Tender Dashboard (Primary Application)

The **Tender Dashboard** is a professional web application that fetches and displays tender opportunities from the UK Government's Find a Tender service, specifically filtered for BNSSG (Bristol, North Somerset and South Gloucestershire) related opportunities.

### Key Features

- Real-time data fetching from Find a Tender OCDS API
- Smart filtering for BNSSG keyword across all tender fields
- Local caching for performance and offline viewing
- Date range filtering and multiple sorting options
- Professional healthcare-appropriate UI design
- Deadline tracking with visual urgency indicators
- Detailed tender information including buyer, value, and deadlines

### Quick Start (Tender Dashboard)

```bash
cd tender-dashboard
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Then open your browser to `http://localhost:5000`

See the [Tender Dashboard README](tender-dashboard/README.md) for complete documentation.

---

## ⚛️ React Web App

A React web application with GitHub Pages deployment capabilities.

### Features

- Built with React 19 and Vite
- Automatic deployment to GitHub Pages via GitHub Actions
- Modern development environment with Hot Module Replacement (HMR)

## Development

### Prerequisites

- Node.js 20 or higher
- npm

### Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to the local development URL (typically `http://localhost:5173`)

### Building

To build the application for production:

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

To preview the production build locally:

```bash
npm run preview
```

## Deployment

This repository is configured to automatically deploy to GitHub Pages when code is pushed to the `main` branch.

### Setup GitHub Pages

1. Go to your repository settings on GitHub
2. Navigate to "Pages" in the left sidebar
3. Under "Build and deployment", select "GitHub Actions" as the source
4. Push to the `main` branch to trigger deployment

The app will be available at: `https://xcaplin.github.io/local-tenders/`

## Project Structure

```
local-tenders/
├── tender-dashboard/          # Flask Tender Dashboard (Primary Application)
│   ├── app.py                # Flask application
│   ├── requirements.txt      # Python dependencies
│   ├── README.md            # Dashboard documentation
│   ├── data/                # Cached tender data
│   ├── static/              # CSS and JavaScript
│   │   ├── css/
│   │   │   └── styles.css
│   │   └── js/
│   │       └── dashboard.js
│   └── templates/           # HTML templates
│       └── index.html
├── .github/
│   └── workflows/
│       └── deploy.yml       # GitHub Actions deployment workflow
├── public/                  # Static assets for React app
│   └── vite.svg            # Favicon
├── src/                     # React application source
│   ├── App.css             # App component styles
│   ├── App.jsx             # Main App component
│   ├── index.css           # Global styles
│   └── main.jsx            # React entry point
├── .gitignore              # Git ignore rules
├── index.html              # HTML entry point (React)
├── package.json            # Project dependencies and scripts
├── README.md               # This file
└── vite.config.js          # Vite configuration
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Push to your branch
4. Create a Pull Request to `main`

## License

ISC
