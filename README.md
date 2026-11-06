# Religion Class Attendance

A responsive Node.js attendance tracker for a class meeting Tuesdays and Thursdays at noon. It uses only Node's built-in modules, so there are no dependencies to install. The interface and class date use the `America/Denver` time zone by default.

## Run locally

1. Install Node.js 18 or newer.
2. In this folder, run `node server.js`.
3. Open [http://localhost:3000](http://localhost:3000).

Set `PORT` to use another port. Set `CLASS_TIME_ZONE` to a valid IANA time zone (for example `America/Los_Angeles`) if the class is in another zone. The browser clock and displayed attendance time currently use Denver time.

## Deploy from GitHub

This project includes `render.yaml` for Render. Connect the GitHub repository to Render and create the web service from the Blueprint. The configuration attaches a persistent disk and points `ATTENDANCE_FILE` to `storage/attendance.json`, preserving check-ins when the service restarts or redeploys. Render's filesystem is otherwise ephemeral, and persistent disks require a paid web-service plan. See [Render's persistent disk documentation](https://render.com/docs/disks).

GitHub Pages alone cannot run the backend or save to `attendance.json`; it serves static files only. The instructor records API should also be protected with authentication before sharing the public URL widely.

## Pages and data

- Student check-in: `/`
- Instructor records dashboard: `/records.html`
- JSON API: `GET /api/attendance`, `POST /api/attendance`
- CSV download: `/api/attendance.csv` or the Export CSV button on the records page
- Persistent file: `attendance.json` in this project folder. The server creates it with an empty array on first access and appends later submissions.

Each record has `firstName`, `lastName`, `date` (class-local `YYYY-MM-DD`), and `timestamp` (UTC ISO 8601). Attendance writes are serialized to protect concurrent check-ins. Only Tuesdays and Thursdays are accepted, and a student name can be recorded once per class date.

## Security and deployment

Keep the instructor dashboard on a trusted network; it has no authentication in this starter app. Before exposing it to the public internet, add instructor authentication and HTTPS, restrict access to the records and export endpoints, and use a database or atomic file locking if running multiple server processes. Back up `attendance.json` regularly. Names are validated and escaped in the dashboard; API request bodies are size-limited.
