# GitHub Pages Setup Guide

## One-Time Setup (Web UI - No CLI Needed)

To enable your React app on GitHub Pages:

### Step 1: Enable GitHub Pages
1. Visit your repository settings: https://github.com/xcaplin/local-tenders/settings/pages
2. Under **"Build and deployment"**:
   - **Source**: Select **"GitHub Actions"** from the dropdown
3. The page will save automatically

### Step 2: Trigger Deployment
The deployment will start automatically. You can:
- Wait for the automatic deployment (triggered by the workflow)
- OR manually trigger it by going to: https://github.com/xcaplin/local-tenders/actions
  - Click on "Deploy to GitHub Pages" workflow
  - Click "Run workflow" button
  - Select "main" branch
  - Click "Run workflow"

### Step 3: Access Your App
Once deployment completes (2-3 minutes), your app will be live at:

**🌐 https://xcaplin.github.io/local-tenders/**

## What You'll See

The app includes:
- **Title**: "Local Tenders"
- **Welcome message**: "Welcome to your GitHub Pages React App"
- **Interactive counter button**: Click to increment the count
- **Fully responsive design**: Works on mobile, tablet, and desktop
- **No backend required**: Runs entirely in the browser

## Automatic Updates

Every time you push to the `main` branch:
1. GitHub Actions automatically rebuilds the app
2. Deploys the new version to GitHub Pages
3. Your live site updates within 2-3 minutes

## Verification

After setup, the app should:
✅ Load at the GitHub Pages URL
✅ Display the "Local Tenders" heading
✅ Show a working counter button
✅ Be fully interactive in the browser
✅ Require no CLI or server management

## Troubleshooting

If you see a 404 or 403 error:
- Make sure GitHub Pages is enabled (Step 1 above)
- Check that the workflow has run successfully in the Actions tab
- Wait 2-3 minutes for DNS propagation

---

**That's it!** Your React app will run completely on GitHub Pages with zero CLI interaction needed.
