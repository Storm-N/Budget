// Dependency-free Node.js server for the attendance API and static site.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { URL } = require('node:url');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA = process.env.ATTENDANCE_FILE || path.join(ROOT, 'attendance.json');
const PORT = Number(process.env.PORT) || 3000;
const TZ = process.env.CLASS_TIME_ZONE || 'America/Denver';
let queue = Promise.resolve();

async function serialized(task) {
  const pending = queue.then(task);
  queue = pending.catch(() => {});
  return pending;
}
async function records() {
  await fs.mkdir(path.dirname(DATA), { recursive: true });
  try {
    const parsed = JSON.parse(await fs.readFile(DATA, 'utf8'));
    if (!Array.isArray(parsed)) throw new Error('Attendance JSON must be an array.');
    return parsed;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await fs.writeFile(DATA, '[]\n', { flag: 'wx' }).catch(e => { if (e.code !== 'EEXIST') throw e; });
    return records();
  }
}
function send(res, status, body, type = 'application/json; charset=utf-8', headers = {}) {
  const content = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
  res.writeHead(status, { 'Content-Type': type, 'Content-Length': content.length, 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(content);
}
function clean(value) { return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''; }
function localParts(date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(date);
  return Object.fromEntries(parts.map(p => [p.type, p.value]));
}
function escapeCsv(value) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method === 'GET' && url.pathname === '/api/attendance') {
      const all = await serialized(records);
      return send(res, 200, all.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    }
    if (req.method === 'GET' && url.pathname === '/api/attendance.csv') {
      const all = await serialized(records);
      const rows = [['First Name', 'Last Name', 'Date', 'Time'], ...all.sort((a,b) => b.timestamp.localeCompare(a.timestamp)).map(r => [r.firstName, r.lastName, r.date, r.timestamp])];
      return send(res, 200, '\ufeff' + rows.map(row => row.map(escapeCsv).join(',')).join('\r\n'), 'text/csv; charset=utf-8', { 'Content-Disposition': 'attachment; filename="attendance.csv"' });
    }
    if (req.method === 'POST' && url.pathname === '/api/attendance') {
      let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 10240) return send(res, 413, { error: 'Request is too large.' }); }
      let input; try { input = JSON.parse(raw); } catch { return send(res, 400, { error: 'Submit a valid JSON request.' }); }
      const firstName = clean(input?.firstName); const lastName = clean(input?.lastName);
      if (!firstName || !lastName) return send(res, 400, { error: 'Enter both your first and last name.' });
      if (firstName.length > 80 || lastName.length > 80 || /[\u0000-\u001f\u007f]/.test(firstName + lastName)) return send(res, 400, { error: 'Names must be 80 characters or fewer.' });
      const now = new Date(); const parts = localParts(now);
      if (!['Tue', 'Thu'].includes(parts.weekday)) return send(res, 403, { error: 'Attendance can only be submitted on class days: Tuesday and Thursday.' });
      const date = `${parts.year}-${parts.month}-${parts.day}`;
      const result = await serialized(async () => {
        const all = await records();
        const same = name => clean(name).toLocaleLowerCase('en-US');
        if (all.some(r => r.date === date && same(r.firstName) === same(firstName) && same(r.lastName) === same(lastName))) return { duplicate: true };
        const record = { firstName, lastName, date, timestamp: now.toISOString() };
        all.push(record);
        await fs.writeFile(DATA, JSON.stringify(all, null, 2) + '\n', 'utf8');
        return { record };
      });
      if (result.duplicate) return send(res, 409, { error: 'You have already checked in for today’s class.' });
      return send(res, 201, { message: 'Attendance recorded. You’re all set!', record: result.record });
    }
    if (req.method === 'GET') {
      const target = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
      const file = path.resolve(PUBLIC, target);
      if (!file.startsWith(PUBLIC + path.sep) || !file.startsWith(path.resolve(PUBLIC) + path.sep)) return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
      const data = await fs.readFile(file);
      const ext = path.extname(file);
      const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
      return send(res, 200, data, types[ext] || 'application/octet-stream', { 'Cache-Control': 'no-cache' });
    }
    return send(res, 404, { error: 'Not found.' });
  } catch (error) {
    console.error(error);
    if (!res.headersSent) send(res, error.code === 'ENOENT' ? 404 : 500, { error: error.code === 'ENOENT' ? 'Page not found.' : 'The server could not complete the request.' });
    else res.destroy();
  }
});
server.listen(PORT, '0.0.0.0', () => console.log(`Religion Class Attendance is running at http://localhost:${PORT}`));
