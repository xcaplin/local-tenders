# Local Tenders

A React web application hosted on GitHub Pages.

## Features

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
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions deployment workflow
├── public/                     # Static assets
│   └── vite.svg               # Favicon
├── src/
│   ├── App.css                # App component styles
│   ├── App.jsx                # Main App component
│   ├── index.css              # Global styles
│   └── main.jsx               # React entry point
├── .gitignore                 # Git ignore rules
├── index.html                 # HTML entry point
├── package.json               # Project dependencies and scripts
├── README.md                  # This file
└── vite.config.js             # Vite configuration
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Push to your branch
4. Create a Pull Request to `main`

## License

ISC
