/* ─── Config ──────────────────────────────────────────────────────────── */
const API = ''; // same origin — leer lassen wenn Frontend & Backend auf gleichem Server
const REFRESH_INTERVAL = 5 * 60 * 1000; // Auto-Refresh alle 5 Minuten

// Demo-Daten werden verwendet wenn kein Backend verfügbar ist
// Stand: 20.05.–18.06.2026 (Metricool-Report KW25)
const DEMO_KPIS = {
  instagram: {
    configured: true,
    followers: 6507,
    reach: 92740,
    impressions: 92740,
    profileViews: 1562,
  },
  tiktok: {
    configured: true,
    followers: 53190,
    views: 1280,
    posts: 4,
  },
  youtube: {
    configured: true,
    channelName: 'The Escape Theorie',
    subscribers: 159,
    views: 192,
    videoCount: 1,
  },
  fetchedAt: new Date().toISOString(),
};

const DEMO_HISTORY = {
  snapshots: [
    { date: '2026-03-20', kw: 12, instagram: { followers: 5800, reach: 5200, interactions: 180 }, youtube: { subscribers: 1100, views: 38200 }, tiktok: { followers: null } },
    { date: '2026-03-27', kw: 13, instagram: { followers: 5858, reach: 5800, interactions: 210 }, youtube: { subscribers: 1115, views: 39400 }, tiktok: { followers: null } },
    { date: '2026-04-03', kw: 14, instagram: { followers: 5912, reach: 6200, interactions: 230 }, youtube: { subscribers: 1132, views: 40800 }, tiktok: { followers: null } },
    { date: '2026-04-10', kw: 15, instagram: { followers: 5964, reach: 6800, interactions: 250 }, youtube: { subscribers: 1148, views: 42100 }, tiktok: { followers: null } },
    { date: '2026-04-17', kw: 16, instagram: { followers: 6020, reach: 7200, interactions: 280 }, youtube: { subscribers: 1165, views: 43500 }, tiktok: { followers: null } },
    { date: '2026-04-24', kw: 17, instagram: { followers: 6080, reach: 8100, interactions: 320 }, youtube: { subscribers: 1185, views: 44800 }, tiktok: { followers: null } },
    { date: '2026-05-01', kw: 18, instagram: { followers: 6145, reach: 8500, interactions: 340 }, youtube: { subscribers: 1205, views: 46200 }, tiktok: { followers: null } },
    { date: '2026-05-08', kw: 19, instagram: { followers: 6210, reach: 9200, interactions: 380 }, youtube: { subscribers: 1225, views: 47600 }, tiktok: { followers: null } },
    { date: '2026-05-15', kw: 20, instagram: { followers: 6270, reach: 8800, interactions: 350 }, youtube: { subscribers: 1248, views: 48900 }, tiktok: { followers: null } },
    { date: '2026-05-22', kw: 21, instagram: { followers: 6335, reach: 9500, interactions: 420 }, youtube: { subscribers: 1268, views: 50100 }, tiktok: { followers: null } },
    { date: '2026-05-29', kw: 22, instagram: { followers: 6408, reach: 10200, interactions: 480 }, youtube: { subscribers: 1320, views: 51400 }, tiktok: { followers: null } },
    { date: '2026-06-05', kw: 23, instagram: { followers: 6490, reach: 11800, interactions: 530 }, youtube: { subscribers: 1380, views: 52900 }, tiktok: { followers: null } },
    { date: '2026-06-12', kw: 24, instagram: { followers: 6498, reach: 81980, interactions: 337 }, youtube: { subscribers: 159, views: 264 }, tiktok: { followers: 53200, views: 1181, interactions: 21 } },
    { date: '2026-06-19', kw: 25, instagram: { followers: 6507, reach: 92740, interactions: 352 }, youtube: { subscribers: 159, views: 192 }, tiktok: { followers: 53190, views: 1280, interactions: 27 } },
  ],
};

const DEMO_ASANA = [
  { type: 'asana', name: 'SM-News Karussell KW 25', due_on: null, assignee: { name: 'Anne' }, notes: 'KI-Trend: Claude für Content-Teams', permalink_url: 'https://app.asana.com', completed: false },
  { type: 'asana', name: 'Hook-Ideen für Alex Wheels – Brand Personality', due_on: null, assignee: { name: 'Anne' }, notes: '5 Hooks für Brand-Personality-Säule', permalink_url: 'https://app.asana.com', completed: false },
  { type: 'asana', name: 'High-Performer-Reel aufbereiten', due_on: null, assignee: { name: 'Sam' }, notes: 'Bestes Reel der Vorwoche wiederverwerten', permalink_url: 'https://app.asana.com', completed: true },
];

async function apiFetch(path, options) {
  try {
    const res = await fetch(`${API}${path}`, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return null; // Backend nicht erreichbar → Demo-Modus
  }
}

let IS_DEMO = false;

// Ziele für die Fortschrittsbalken
const GOALS = { ig: 10000, tt: 5000, yt: 5000 };

// Festes Wochen-Template (Slot = dayOfWeek 1=Mo … 7=So)
const FIXED_SLOTS = [
  { day: 1, format: 'SM-News Karussell', person: 'Anne', note: 'Automatisch generiert (Mo 08:06)' },
  { day: 2, format: 'Story', person: 'Anne', note: '' },
  { day: 3, format: 'Story + High-Performer-Reel', person: 'Sam', note: '' },
  { day: 5, format: 'Story + Wochenbeitrag', person: 'Evelyn', note: '' },
];

const DAY_NAMES = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const DAY_NAMES_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

/* ─── State ───────────────────────────────────────────────────────────── */
let weekOffset = 0;
let canvaLinks = {};
let canvaEditDate = null;
let charts = {};
let lastKPIs = {};

/* ─── Date helpers ────────────────────────────────────────────────────── */
function getMondayOfWeek(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

function getKW(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function formatDate(d) {
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function isoDate(d) {
  return d.toISOString().split('T')[0];
}

function fmt(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('de-DE');
}

/* ─── KPI Cards ───────────────────────────────────────────────────────── */
// Statische Tageszahlen (vom tet-daily-kpi-Task geschrieben, funktioniert auf GitHub Pages ohne Backend).
// WICHTIG: relativer Pfad './kpi-live.json' (GitHub-Pages-Projektpfad — absolut wäre leer).
async function loadStaticKPIs() {
  try {
    const res = await fetch('./kpi-live.json', { cache: 'no-store' });
    if (!res.ok) return null;
    const j = await res.json();
    return (j && j.instagram && j.instagram.followers != null) ? j : null;
  } catch { return null; }
}

async function loadKPIs() {
  // Reihenfolge: 1) echte Tageszahlen (statisch) → 2) Live-Backend → 3) Demo
  const data = await loadStaticKPIs()
    ?? await apiFetch('/api/kpis')
    ?? (() => { IS_DEMO = true; return DEMO_KPIS; })();
  lastKPIs = data;

  const notConfigured = !data.configured || IS_DEMO;

  // Show/hide setup button
  const setupBtn = document.getElementById('setup-btn');
  if (setupBtn) setupBtn.style.display = notConfigured ? 'inline-flex' : 'none';

  // Enrich per-platform objects with top-level configured flag
  const ig = notConfigured ? null : (data.instagram ?? {});
  const tt = notConfigured ? null : (data.tiktok ?? {});
  const yt = notConfigured ? null : (data.youtube ?? {});

  if (IS_DEMO) {
    renderIGCard(DEMO_KPIS.instagram);
    renderTTCard(DEMO_KPIS.tiktok);
    renderYTCard(DEMO_KPIS.youtube);
  } else if (!data.configured) {
    renderIGCard(null);
    renderTTCard(null);
    renderYTCard(null);
  } else {
    renderIGCard(ig.followers != null ? { configured: true, ...ig } : null);
    renderTTCard(tt.followers != null ? { configured: true, ...tt } : null);
    renderYTCard(yt.views != null ? { configured: true, ...yt } : null);
  }

  const time = new Date(data.fetchedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('last-update').textContent =
    (IS_DEMO ? '🔵 Demo-Modus · Stand ' : 'Aktualisiert ') + time + ' Uhr';
}

function renderKWHeader() {
  const monday = getMondayOfWeek(0);
  const kw = getKW(monday);
  document.getElementById('header-kw').textContent = `KW ${kw}`;
}

function setBadge(id, type, label) {
  const el = document.getElementById(id);
  el.className = `platform-badge badge-${type}`;
  el.textContent = label;
}

function renderIGCard(ig) {
  const el = document.getElementById('ig-content');
  if (!ig || !ig.configured) {
    setBadge('ig-badge', 'setup', 'Setup');
    el.innerHTML = metricoolPlaceholder('Instagram');
    return;
  }
  if (ig.error) {
    setBadge('ig-badge', 'error', 'Fehler');
    el.innerHTML = errorPlaceholder(ig.error);
    return;
  }
  setBadge('ig-badge', 'live', '● Live');

  const history = getLastHistory('instagram', 'followers');
  const prevFollowers = history.prev;
  const delta = prevFollowers != null ? ig.followers - prevFollowers : null;
  const pct = Math.min(100, ((ig.followers / GOALS.ig) * 100)).toFixed(1);

  el.innerHTML = `
    <div class="kpi-main">
      <div class="kpi-number">${fmt(ig.followers)}</div>
      <div class="kpi-label">Follower · Ziel: ${fmt(GOALS.ig)}</div>
      ${delta != null ? `<div class="kpi-delta ${delta >= 0 ? 'positive' : 'negative'}">${delta >= 0 ? '↑' : '↓'} ${fmt(Math.abs(delta))} seit letztem Stichtag</div>` : ''}
    </div>
    <div class="goal-bar-wrap">
      <div class="goal-bar-label"><span>Fortschritt 10K</span><span>${pct}%</span></div>
      <div class="goal-bar-track"><div class="goal-bar-fill" style="width:${pct}%"></div></div>
    </div>
    <div class="kpi-metrics" style="margin-top:14px;">
      <div class="kpi-metric-item">
        <div class="kpi-metric-val">${fmt(ig.reach)}</div>
        <div class="kpi-metric-lbl">Wöch. Reichweite</div>
      </div>
      <div class="kpi-metric-item">
        <div class="kpi-metric-val">${fmt(ig.impressions)}</div>
        <div class="kpi-metric-lbl">Impressionen</div>
      </div>
      <div class="kpi-metric-item">
        <div class="kpi-metric-val">${fmt(ig.profileViews)}</div>
        <div class="kpi-metric-lbl">Profilaufrufe</div>
      </div>
      <div class="kpi-metric-item">
        <div class="kpi-metric-val">${ig.followers ? ((ig.reach / ig.followers) * 100).toFixed(1) + '%' : '—'}</div>
        <div class="kpi-metric-lbl">Reach-Rate</div>
      </div>
    </div>`;
}

function renderTTCard(tt) {
  const el = document.getElementById('tt-content');
  if (!tt || !tt.configured) {
    setBadge('tt-badge', 'setup', 'Setup');
    el.innerHTML = metricoolPlaceholder('TikTok');
    return;
  }
  if (tt.error) {
    setBadge('tt-badge', 'error', 'Fehler');
    el.innerHTML = errorPlaceholder(tt.error);
    return;
  }
  setBadge('tt-badge', 'live', '● Live');
  const pct = Math.min(100, ((tt.followers / GOALS.tt) * 100)).toFixed(1);
  el.innerHTML = `
    <div class="kpi-main">
      <div class="kpi-number">${fmt(tt.followers)}</div>
      <div class="kpi-label">Follower · Ziel: ${fmt(GOALS.tt)}</div>
    </div>
    <div class="goal-bar-wrap">
      <div class="goal-bar-label"><span>Fortschritt 5K</span><span>${pct}%</span></div>
      <div class="goal-bar-track"><div class="goal-bar-fill" style="width:${pct}%"></div></div>
    </div>
    <div class="kpi-metrics" style="margin-top:14px;">
      <div class="kpi-metric-item">
        <div class="kpi-metric-val">${fmt(tt.likes)}</div>
        <div class="kpi-metric-lbl">Gesamt-Likes</div>
      </div>
      <div class="kpi-metric-item">
        <div class="kpi-metric-val">${fmt(tt.videoCount)}</div>
        <div class="kpi-metric-lbl">Videos</div>
      </div>
    </div>`;
}

function renderYTCard(yt) {
  const el = document.getElementById('yt-content');
  if (!yt || !yt.configured) {
    setBadge('yt-badge', 'setup', 'Setup');
    el.innerHTML = metricoolPlaceholder('YouTube');
    return;
  }
  if (yt.error) {
    setBadge('yt-badge', 'error', 'Fehler');
    el.innerHTML = errorPlaceholder(yt.error);
    return;
  }
  setBadge('yt-badge', 'live', '● Live');
  const history = getLastHistory('youtube', 'subscribers');
  const delta = history.prev != null ? yt.subscribers - history.prev : null;
  const pct = Math.min(100, ((yt.subscribers / GOALS.yt) * 100)).toFixed(1);
  el.innerHTML = `
    <div class="kpi-main">
      <div class="kpi-number">${fmt(yt.subscribers)}</div>
      <div class="kpi-label">Abonnenten · Ziel: ${fmt(GOALS.yt)}</div>
      ${delta != null ? `<div class="kpi-delta ${delta >= 0 ? 'positive' : 'negative'}">${delta >= 0 ? '↑' : '↓'} ${fmt(Math.abs(delta))} seit letztem Stichtag</div>` : ''}
    </div>
    <div class="goal-bar-wrap">
      <div class="goal-bar-label"><span>Fortschritt 5K</span><span>${pct}%</span></div>
      <div class="goal-bar-track"><div class="goal-bar-fill" style="width:${pct}%"></div></div>
    </div>
    <div class="kpi-metrics" style="margin-top:14px;">
      <div class="kpi-metric-item">
        <div class="kpi-metric-val">${fmt(yt.views)}</div>
        <div class="kpi-metric-lbl">Aufrufe gesamt</div>
      </div>
      <div class="kpi-metric-item">
        <div class="kpi-metric-val">${fmt(yt.videoCount)}</div>
        <div class="kpi-metric-lbl">Videos</div>
      </div>
    </div>`;
}

function metricoolPlaceholder(platform) {
  return `<div class="kpi-placeholder">
    <span class="icon">⚙️</span>
    <strong style="color:var(--white);font-size:12px;">${platform} via Metricool</strong>
    <span style="font-size:12px;">Einmalig verbinden unter<br>
      <a href="/setup" style="color:var(--blue);text-decoration:none;font-weight:600;">Setup → Metricool verbinden</a>
    </span>
  </div>`;
}

function errorPlaceholder(msg) {
  return `<div class="kpi-placeholder">
    <span class="icon">⚠️</span>
    <span style="color:var(--red);font-size:11px;">${msg}</span>
  </div>`;
}

/* ─── KPI History helpers ─────────────────────────────────────────────── */
let kpiHistory = { snapshots: [] };

function getLastHistory(platform, field) {
  const snaps = kpiHistory.snapshots;
  if (snaps.length < 2) return { prev: null };
  const last = snaps[snaps.length - 2];
  return { prev: last?.[platform]?.[field] ?? null };
}

async function loadHistory() {
  kpiHistory = await apiFetch('/api/kpi-history') ?? DEMO_HISTORY;
  renderCharts();
  const n = kpiHistory.snapshots.length;
  document.getElementById('chart-weeks').textContent =
    n > 0 ? `${n} Stichtage (Freitags)` : '';
}

/* ─── Charts ──────────────────────────────────────────────────────────── */
const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: '#6b85a8', font: { size: 11, family: 'Inter' }, boxWidth: 10, padding: 12 },
    },
    tooltip: {
      backgroundColor: '#0a1832',
      borderColor: 'rgba(124,167,235,0.2)',
      borderWidth: 1,
      titleColor: '#fff',
      bodyColor: '#8a9bb5',
      padding: 10,
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(124,167,235,0.06)' },
      ticks: { color: '#6b85a8', font: { size: 10, family: 'Inter' } },
    },
    y: {
      grid: { color: 'rgba(124,167,235,0.06)' },
      ticks: { color: '#6b85a8', font: { size: 10, family: 'Inter' } },
    },
  },
};

function renderCharts() {
  const snaps = kpiHistory.snapshots.slice(-16); // max 16 Wochen
  const labels = snaps.map((s) => `KW${s.kw ?? ''}`);

  const igFollowers   = snaps.map((s) => s.instagram?.followers ?? null);
  const ytSubs        = snaps.map((s) => s.youtube?.subscribers ?? null);
  const ttFollowers   = snaps.map((s) => s.tiktok?.followers ?? null);
  const igReach       = snaps.map((s) => s.instagram?.reach ?? null);
  const igInteract    = snaps.map((s) => s.instagram?.interactions ?? null);

  buildChart('chart-followers', labels, [
    { label: 'Instagram', data: igFollowers, borderColor: '#E1306C', backgroundColor: 'rgba(225,48,108,0.08)', tension: 0.35 },
    { label: 'TikTok',    data: ttFollowers, borderColor: '#69C9D0', backgroundColor: 'rgba(105,201,208,0.08)', tension: 0.35 },
    { label: 'YouTube',   data: ytSubs,      borderColor: '#FF4444', backgroundColor: 'rgba(255,68,68,0.08)',  tension: 0.35 },
  ]);

  buildChart('chart-reach', labels, [
    { label: 'IG Reichweite', data: igReach, borderColor: '#7CA7EB', backgroundColor: 'rgba(124,167,235,0.1)', tension: 0.35 },
  ]);

  buildChart('chart-interactions', labels, [
    { label: 'IG Interaktionen', data: igInteract, borderColor: '#CDB08F', backgroundColor: 'rgba(205,176,143,0.1)', tension: 0.35 },
  ]);
}

function buildChart(id, labels, datasets) {
  const ctx = document.getElementById(id).getContext('2d');
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: datasets.map((d) => ({
        ...d,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: d.borderColor,
        spanGaps: true,
      })),
    },
    options: { ...CHART_DEFAULTS },
  });
}

/* ─── Week Plan ───────────────────────────────────────────────────────── */
async function loadWeekPlan() {
  const monday = getMondayOfWeek(weekOffset);
  const kw = getKW(monday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  document.getElementById('week-label').textContent =
    `KW ${kw} · ${formatDate(monday)} – ${formatDate(sunday)}`;

  // Load Canva links
  canvaLinks = await apiFetch('/api/canva-links') ?? {};

  // Load Asana tasks
  // Zuerst statische asana-live.json (vom tet-daily-kpi geschrieben, GitHub-Pages-tauglich, relativer Pfad),
  // dann Live-Backend, dann Demo. So spiegelt das Dashboard 1:1 den echten Asana-Redaktionsplan.
  let asanaData = null;
  if (weekOffset === 0) {
    try {
      const r = await fetch('./asana-live.json', { cache: 'no-store' });
      if (r.ok) { const j = await r.json(); if (Array.isArray(j?.tasks)) asanaData = j; }
    } catch {}
  }
  asanaData = asanaData ?? await apiFetch(`/api/asana/tasks?week=${weekOffset}`);
  let asanaTasks = asanaData?.tasks ?? [];

  // Demo: inject sample tasks for current week
  if (!asanaData && weekOffset === 0) {
    const monday = getMondayOfWeek(0);
    DEMO_ASANA[0].due_on = isoDate(new Date(monday.getTime() + 0 * 86400000)); // Mo
    DEMO_ASANA[1].due_on = isoDate(new Date(monday.getTime() + 2 * 86400000)); // Mi
    DEMO_ASANA[2].due_on = isoDate(new Date(monday.getTime() + 2 * 86400000)); // Mi
    asanaTasks = DEMO_ASANA;
  }

  renderPlan(monday, asanaTasks);
}

function renderPlan(monday, asanaTasks) {
  const todayISO = isoDate(new Date());
  const tbody = document.getElementById('plan-tbody');
  const rows = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateISO = isoDate(date);
    const dayIdx = date.getDay(); // 0=So, 1=Mo…

    // Fixed template slots for this day
    const fixed = FIXED_SLOTS.filter((s) => s.day === dayIdx);

    // Asana tasks for this day
    const tasks = asanaTasks.filter((t) => t.due_on === dateISO);

    // Combine: fixed slots + asana tasks (avoid duplicates by format)
    const allEntries = [];
    fixed.forEach((f) => allEntries.push({ type: 'fixed', ...f, date: dateISO }));
    tasks.forEach((t) => allEntries.push({ type: 'asana', ...t, date: dateISO }));

    const isToday = dateISO === todayISO;

    if (allEntries.length === 0) {
      rows.push(`
        <tr class="${isToday ? 'today' : ''}">
          <td class="day-cell">
            <div class="day-name">${DAY_NAMES[dayIdx]}, ${formatDate(date)}</div>
          </td>
          <td colspan="5" style="color:var(--text-dim);font-size:12px;">—</td>
        </tr>`);
    } else {
      allEntries.forEach((entry, ei) => {
        rows.push(`
          <tr class="${isToday ? 'today' : ''}">
            ${ei === 0 ? `<td class="day-cell" rowspan="${allEntries.length}">
              <div class="day-name">${DAY_NAMES[dayIdx]}, ${formatDate(date)}</div>
            </td>` : ''}
            <td>${entry.format ?? entry.name ?? '—'}</td>
            <td>${entry.person ? `<span class="person-badge">${entry.person}</span>` : (entry.assignee?.name ? `<span class="person-badge">${entry.assignee.name}</span>` : '—')}</td>
            <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${entry.note ?? entry.notes ?? ''}">${entry.note || entry.notes || '<span style="color:var(--text-dim)">—</span>'}</td>
            <td>${renderStatus(entry)}</td>
            <td style="white-space:nowrap;">${renderLinks(entry, dateISO)}</td>
          </tr>`);
      });
    }
  }

  tbody.innerHTML = rows.join('');
}

function renderStatus(entry) {
  if (entry.type === 'asana') {
    if (entry.completed) return '<span class="status-badge status-done">✓ Erledigt</span>';
    return '<span class="status-badge status-planned">○ Geplant</span>';
  }
  return '<span class="status-badge status-planned">○ Geplant</span>';
}

function renderLinks(entry, dateISO) {
  let html = '';

  if (entry.type === 'asana' && entry.permalink_url) {
    html += `<a class="link-btn asana" href="${entry.permalink_url}" target="_blank" rel="noopener">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="3"/><circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/></svg>
      Asana
    </a>`;
  }

  const canva = canvaLinks[dateISO];
  if (canva) {
    html += `<a class="link-btn canva" href="${canva}" target="_blank" rel="noopener">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>
      Canva
    </a>`;
    html += `<button class="link-btn add-canva" onclick="editCanvaLink('${dateISO}', event)">✎</button>`;
  } else {
    html += `<button class="link-btn add-canva" onclick="editCanvaLink('${dateISO}', event)">+ Canva</button>`;
  }

  return html || '<span style="color:var(--text-dim);font-size:12px;">—</span>';
}

/* ─── Canva Link Editing ──────────────────────────────────────────────── */
function editCanvaLink(date, event) {
  canvaEditDate = date;
  const wrap = document.getElementById('canva-input-wrap');
  const input = document.getElementById('canva-url-input');
  input.value = canvaLinks[date] ?? '';
  wrap.style.display = 'block';

  const rect = event.target.getBoundingClientRect();
  wrap.style.top = (rect.bottom + window.scrollY + 6) + 'px';
  wrap.style.left = Math.min(rect.left, window.innerWidth - 380) + 'px';
  wrap.style.position = 'absolute';

  setTimeout(() => input.focus(), 50);
}

function cancelCanvaInput() {
  document.getElementById('canva-input-wrap').style.display = 'none';
  canvaEditDate = null;
}

async function confirmCanvaInput() {
  if (!canvaEditDate) return;
  const url = document.getElementById('canva-url-input').value.trim();
  const result = await apiFetch('/api/canva-links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: canvaEditDate, url }),
  });
  if (result === null && IS_DEMO) {
    // Demo-Modus: lokal speichern
    if (url) canvaLinks[canvaEditDate] = url;
    else delete canvaLinks[canvaEditDate];
  }
  cancelCanvaInput();
  loadWeekPlan();
}

document.addEventListener('click', (e) => {
  const wrap = document.getElementById('canva-input-wrap');
  if (wrap.style.display !== 'none' && !wrap.contains(e.target) && !e.target.classList.contains('add-canva')) {
    cancelCanvaInput();
  }
});

/* ─── Week Navigation ─────────────────────────────────────────────────── */
function changeWeek(delta) {
  if (delta === 0) weekOffset = 0;
  else weekOffset += delta;
  loadWeekPlan();
}

/* ─── Snapshot Modal ──────────────────────────────────────────────────── */
function openSnapshotModal() {
  document.getElementById('snapshot-modal').classList.add('open');
}

function closeSnapshotModal() {
  document.getElementById('snapshot-modal').classList.remove('open');
}

async function saveSnapshot() {
  const manual = {
    instagram: {
      followers: numVal('snap-ig-followers'),
      reach: numVal('snap-ig-reach'),
      interactions: numVal('snap-ig-interactions'),
    },
    youtube: {
      subscribers: numVal('snap-yt-subs'),
      views: numVal('snap-yt-views'),
    },
    tiktok: {
      followers: numVal('snap-tt-followers'),
    },
  };

  // Remove null/undefined overrides
  Object.keys(manual).forEach((k) => {
    Object.keys(manual[k]).forEach((f) => {
      if (manual[k][f] == null) delete manual[k][f];
    });
    if (Object.keys(manual[k]).length === 0) delete manual[k];
  });

  if (IS_DEMO) {
    closeSnapshotModal();
    alert('Demo-Modus: Snapshot-Speicherung ist nur mit laufendem Backend möglich.');
    return;
  }
  const data = await apiFetch('/api/kpi-history/snapshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ manual: Object.keys(manual).length ? manual : undefined }),
  });
  if (!data || data.error) { alert('Fehler: ' + (data?.error ?? 'Unbekannt')); return; }
  closeSnapshotModal();
  await loadHistory();
  alert(`✓ Snapshot für ${data.snapshot.date} (KW${data.snapshot.kw}) gespeichert!`);
}

function numVal(id) {
  const v = document.getElementById(id).value.trim();
  return v ? parseInt(v) : null;
}

/* ─── Refresh ─────────────────────────────────────────────────────────── */
async function refreshAll() {
  document.getElementById('last-update').textContent = '⟳ Aktualisiere…';
  await Promise.all([loadKPIs(), loadHistory(), loadWeekPlan()]);
}

/* ─── Impulse Preview ────────────────────────────────────────────────── */
async function loadImpulsePreview() {
  try {
    const res = await fetch('/content-impulse-data.json?t=' + Date.now());
    if (!res.ok) return;
    const data = await res.json();
    const kwEl = document.getElementById('impulse-kw');
    if (kwEl && data.updated) kwEl.textContent = 'KW ' + (data.kw || '—') + ' · ' + data.updated;
    const preview = document.getElementById('impulse-preview');
    if (!preview || !data.pillars) return;
    preview.innerHTML = data.pillars.map(p =>
      `<span style="font-size:11px;background:rgba(205,176,143,0.1);border:1px solid rgba(205,176,143,0.2);color:#CDB08F;padding:2px 8px;border-radius:12px;">${p.emoji || ''} ${p.name}</span>`
    ).join('');
  } catch (e) {}
}

/* ─── Init ────────────────────────────────────────────────────────────── */
async function init() {
  renderKWHeader();
  await Promise.all([loadKPIs(), loadHistory(), loadWeekPlan(), loadImpulsePreview()]);
  setInterval(refreshAll, REFRESH_INTERVAL);
}

init();
