# StudentBudget

A responsive, browser-only college budget planner. It uses plain HTML, CSS, and JavaScript, so there is no build step or backend. Financial records are stored in the browser's `localStorage`.

## Run locally

Open `index.html` in a modern browser. For a local server, run `python -m http.server 8000` in this directory and visit `http://localhost:8000`.

## Publish on GitHub Pages

1. Create a GitHub repository and push these files to its `main` branch.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions** as the source.
4. The included `.github/workflows/pages.yml` deploys the site after each push to `main`. When the workflow completes, the Pages URL appears in the workflow run and in **Settings → Pages**.

No package installation or build configuration is needed. The site is static and can also be hosted by any static web host.

## Privacy and data

Records remain in the current browser profile on the current device. Publishing the site does not publish any saved records; each visitor has their own local data. Clearing browser storage removes records, so use **Settings → Export JSON** for a backup. GitHub Pages serves the app publicly, but it does not provide cross-device sync or an account system.

## Features

- Monthly dashboard and spending chart, with month selection
- Income and expense tracking, editing, deletion, expense search, and category filter
- Category budgets, savings goals, data-driven insights, and four financial calculators
- JSON backup, monthly CSV report, dark mode, responsive mobile navigation, and data reset
