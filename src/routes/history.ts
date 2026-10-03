import type { FastifyInstance } from "fastify"
import type { ServerResponse } from "node:http"
import { config } from "../config.js"
import { getHistory, onChange } from "../utils/execution-history.js"
import { getMealieTheme, type MealieTheme, type MealieThemeColors } from "../services/mealie-theme.js"

const clients = new Set<ServerResponse>()
let unsubscribe: (() => void) | null = null

function pushSnapshot(): void {
  const payload = `data: ${JSON.stringify(getHistory())}\n\n`
  for (const client of clients) {
    try {
      client.write(payload)
    } catch {
      clients.delete(client)
    }
  }
}

function ensureSubscription(): void {
  if (unsubscribe) return
  unsubscribe = onChange(pushSnapshot)
}

function colorVars(colors: MealieThemeColors): string {
  return [
    `    --primary: ${colors.primary};`,
    `    --accent: ${colors.accent};`,
    `    --secondary: ${colors.secondary};`,
    `    --success: ${colors.success};`,
    `    --info: ${colors.info};`,
    `    --warning: ${colors.warning};`,
    `    --error: ${colors.error};`,
  ].join("\n")
}

function themeCss(theme: MealieTheme): string {
  return `:root {
${colorVars(theme.light)}
    --bg: #ffffff;
    --surface: #ffffff;
    --on-surface: 0, 0, 0;
    --border-base: 0, 0, 0;
    --link: ${theme.light.accent};
  }
  @media (prefers-color-scheme: dark) {
    :root {
${colorVars(theme.dark)}
      --bg: #1e1e1e;
      --surface: #1e1e1e;
      --on-surface: 255, 255, 255;
      --border-base: 255, 255, 255;
      --link: color-mix(in srgb, ${theme.dark.accent} 78%, white);
    }
  }`
}

const PAGE = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="__THEME_COLOR_LIGHT__">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="__THEME_COLOR_DARK__">
<link rel="icon" href="data:,">
<title>mealie-calorie-estimator</title>
<style>
  __THEME_CSS__
  * { box-sizing: border-box; }
  html { color-scheme: light dark; }
  body {
    margin: 0; background: var(--bg); color: rgba(var(--on-surface), 0.87);
    font: 14px/1.43 Roboto, sans-serif; -webkit-font-smoothing: antialiased;
  }
  .appbar {
    position: sticky; top: 0; z-index: 3; background: var(--primary); color: #fff;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, .3), 0 2px 6px 2px rgba(0, 0, 0, .15);
  }
  .appbar-inner {
    max-width: 1100px; margin: 0 auto; min-height: 56px; padding: 0 16px;
    display: flex; align-items: center; gap: 12px 16px; flex-wrap: wrap; justify-content: space-between;
  }
  h1 { font-size: 20px; font-weight: 700; margin: 0; white-space: nowrap; }
  .controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  select {
    height: 32px; padding: 0 34px 0 14px; border: none; border-radius: 24px;
    background-color: color-mix(in srgb, var(--primary) 85%, black);
    background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23fff'%3E%3Cpath d='M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    background-size: 18px 18px;
    color: #fff; font: inherit; font-size: 13px; cursor: pointer;
    appearance: none; -webkit-appearance: none;
  }
  select:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
  .count { font-size: 13px; color: rgba(255, 255, 255, .85); white-space: nowrap; }
  .pill {
    height: 24px; display: inline-flex; align-items: center; padding: 0 10px;
    border-radius: 24px; font-size: 12px; font-weight: 500;
    background: rgba(255, 255, 255, .2); color: #fff;
  }
  .pill.live { background: var(--success); }
  .wrap { max-width: 1100px; margin: 0 auto; padding: 24px 16px 48px; }
  .panel {
    background: var(--surface); border-radius: 4px; overflow: clip;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, .3), 0 2px 6px 2px rgba(0, 0, 0, .15);
  }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td {
    text-align: left; vertical-align: top; padding: 0 16px;
    border-bottom: 1px solid rgba(var(--border-base), .12);
  }
  th {
    height: 48px; font-weight: 700; font-size: 14px; color: rgba(var(--on-surface), .6);
    background: var(--surface); position: sticky; top: 56px; z-index: 2;
    vertical-align: middle;
  }
  td { padding-top: 12px; padding-bottom: 12px; }
  tr:last-child td { border-bottom: none; }
  tbody tr:hover td { background: rgba(var(--border-base), .04); }
  a { color: var(--link); text-decoration: none; }
  a:hover { text-decoration: underline; }
  .slug { display: block; font-size: 12px; color: rgba(var(--on-surface), .6); margin-top: 2px; }
  .time, .duration { color: rgba(var(--on-surface), .6); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .trigger { color: rgba(var(--on-surface), .6); }
  .badge {
    display: inline-flex; align-items: center; height: 24px; padding: 0 10px;
    border-radius: 4px; font-size: 12px; font-weight: 400; white-space: nowrap; color: #fff;
  }
  .b-running { background: var(--info); }
  .b-processed { background: var(--success); }
  .b-tags-added { background: var(--accent); }
  .b-manual { background: var(--warning); }
  .b-skipped, .b-filtered { background: rgba(var(--border-base), .12); color: rgba(var(--on-surface), .7); }
  .b-error { background: var(--error); }
  .changes .err { color: var(--error); font-size: 13px; word-break: break-word; }
  .changes .muted { color: rgba(var(--on-surface), .6); font-size: 12px; margin-top: 4px; }
  .nutrients { margin-top: 4px; }
  .nutrients summary {
    cursor: pointer; font-size: 13px; color: rgba(var(--on-surface), .87);
    font-variant-numeric: tabular-nums;
  }
  .nutrients .grid {
    display: grid; grid-template-columns: auto auto; gap: 2px 16px; width: max-content;
    margin: 6px 0 4px; font-size: 12px; color: rgba(var(--on-surface), .6);
  }
  .nutrients .grid b {
    font-weight: 500; color: rgba(var(--on-surface), .8); font-variant-numeric: tabular-nums;
  }
  .empty { padding: 48px 16px; text-align: center; color: rgba(var(--on-surface), .6); }
  .empty code {
    background: rgba(var(--border-base), .08); padding: 2px 6px; border-radius: 4px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px;
  }
  @media (max-width: 720px) {
    th { position: static; }
  }
  @media (max-width: 500px) {
    .panel { overflow: visible; }
    table { min-width: 680px; }
  }
</style>
</head>
<body>
<header class="appbar">
  <div class="appbar-inner">
    <h1>mealie-calorie-estimator</h1>
    <div class="controls">
      <span class="count" id="count"></span>
      <select id="filter-trigger">
        <option value="">All triggers</option>
        <option value="webhook">webhook</option>
        <option value="estimate">estimate</option>
        <option value="backfill">backfill</option>
      </select>
      <select id="filter-status">
        <option value="">All statuses</option>
        <option value="running">running</option>
        <option value="processed">processed</option>
        <option value="tags-added">tags-added</option>
        <option value="manual">manual</option>
        <option value="skipped">skipped</option>
        <option value="filtered">filtered</option>
        <option value="error">error</option>
      </select>
      <span class="pill" id="conn">connecting&hellip;</span>
    </div>
  </div>
</header>
<main class="wrap">
  <div class="panel">
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Trigger</th>
          <th>Recipe</th>
          <th>Status</th>
          <th>Changes</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
    <div class="empty" id="empty" hidden>
      No executions yet &mdash; trigger a recipe webhook or run
      <code>POST /estimate</code>. For sample data start the dev server with
      <code>DEV_SEED_HISTORY=true</code>.
    </div>
  </div>
</main>
<script>
var RECIPE_URL_TEMPLATE = __RECIPE_URL_TEMPLATE__;
var LABELS = {
  "running": "running", "processed": "processed", "tags-added": "tags added",
  "manual": "manual", "skipped": "skipped", "filtered": "filtered", "error": "error"
};
var NUTRIENTS = [
  ["kcalPer100g", "Energy", "kcal"],
  ["proteinPer100g", "Protein", "g"],
  ["carbsPer100g", "Carbs", "g"],
  ["fatPer100g", "Fat", "g"],
  ["saturatedFatPer100g", "Saturated fat", "g"],
  ["transFatPer100g", "Trans fat", "g"],
  ["unsaturatedFatPer100g", "Unsaturated fat", "g"],
  ["fiberPer100g", "Fiber", "g"],
  ["sugarPer100g", "Sugar", "g"],
  ["sodiumPer100g", "Sodium", "mg"],
  ["cholesterolPer100g", "Cholesterol", "mg"]
];
var records = [];
var expanded = {};
var rowsEl = document.getElementById("rows");
var emptyEl = document.getElementById("empty");
var countEl = document.getElementById("count");
var connEl = document.getElementById("conn");
var triggerEl = document.getElementById("filter-trigger");
var statusEl = document.getElementById("filter-status");

function el(tag, cls, text) {
  var node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

function recipeUrl(rec) {
  return RECIPE_URL_TEMPLATE.replace("{slug}", encodeURIComponent(rec.slug));
}

function pad(n) { return n < 10 ? "0" + n : "" + n; }

function timeText(ts) {
  var d = new Date(ts);
  return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
}

function durationText(rec) {
  var ms = rec.status === "running"
    ? Date.now() - rec.startedAt
    : rec.durationMs;
  if (ms == null) return "\u2014";
  if (ms < 1000) return ms + "ms";
  if (ms < 60000) return (ms / 1000).toFixed(1) + "s";
  return Math.floor(ms / 60000) + "m " + Math.round((ms % 60000) / 1000) + "s";
}

function nv(v) { return v == null ? "\u2014" : Math.round(v * 10) / 10; }

function macroText(n) {
  return nv(n.kcalPer100g) + " kcal \u00b7 P " + nv(n.proteinPer100g) + "g \u00b7 C "
    + nv(n.carbsPer100g) + "g \u00b7 F " + nv(n.fatPer100g) + "g";
}

function nutrientDetails(est, recId) {
  var details = el("details", "nutrients");
  if (expanded[recId]) details.open = true;
  details.addEventListener("toggle", function () { expanded[recId] = details.open; });
  details.appendChild(el("summary", null, "Per serving: " + macroText(est.nutrients)));
  var grid = el("div", "grid");
  for (var k = 0; k < NUTRIENTS.length; k++) {
    var spec = NUTRIENTS[k];
    var value = est.nutrients[spec[0]];
    grid.appendChild(el("span", null, spec[1]));
    grid.appendChild(el("b", null, value == null ? "\u2014" : nv(value) + " " + spec[2]));
  }
  details.appendChild(grid);
  details.appendChild(el("div", "muted", est.matchedCount + " of "
    + (est.matchedCount + est.unmatchedCount) + " ingredients matched"));
  return details;
}

function render() {
  var tf = triggerEl.value;
  var sf = statusEl.value;
  var visible = records.filter(function (rec) {
    return (!tf || rec.trigger === tf) && (!sf || rec.status === sf);
  });

  rowsEl.textContent = "";
  countEl.textContent = visible.length === records.length
    ? records.length + (records.length === 1 ? " entry" : " entries")
    : visible.length + " of " + records.length + " entries";

  if (visible.length === 0) {
    emptyEl.hidden = false;
    emptyEl.textContent = records.length === 0
      ? "No executions yet \u2014 trigger a recipe webhook or run POST /estimate. For sample data start the dev server with DEV_SEED_HISTORY=true."
      : "No entries match the current filters.";
  } else {
    emptyEl.hidden = true;
  }

  for (var i = 0; i < visible.length; i++) {
    var rec = visible[i];
    var tr = el("tr");

    tr.appendChild(el("td", "time", timeText(rec.startedAt)));

    tr.appendChild(el("td", "trigger", rec.trigger));

    var recipeCell = el("td");
    var link = el("a", null, rec.recipeName || rec.slug);
    link.href = recipeUrl(rec);
    link.target = "_blank";
    link.rel = "noopener";
    recipeCell.appendChild(link);
    if (rec.recipeName) recipeCell.appendChild(el("span", "slug", rec.slug));
    tr.appendChild(recipeCell);

    tr.appendChild(el("td")).appendChild(
      el("span", "badge b-" + rec.status, LABELS[rec.status] || rec.status)
    );

    var changesCell = el("td", "changes");
    for (var j = 0; j < rec.changes.length; j++) {
      changesCell.appendChild(el("div", null, rec.changes[j]));
    }
    if (rec.estimate && rec.estimate.nutrients) {
      changesCell.appendChild(nutrientDetails(rec.estimate, rec.id));
    }
    if (rec.error) changesCell.appendChild(el("div", "err", rec.error));
    tr.appendChild(changesCell);

    tr.appendChild(el("td", "duration", durationText(rec)));

    rowsEl.appendChild(tr);
  }
}

triggerEl.addEventListener("change", render);
statusEl.addEventListener("change", render);

var source = new EventSource("/estimator/history/events");

source.onopen = function () {
  connEl.textContent = "live";
  connEl.classList.add("live");
};

source.onerror = function () {
  connEl.textContent = "reconnecting\u2026";
  connEl.classList.remove("live");
};

source.onmessage = function (event) {
  records = JSON.parse(event.data);
  render();
};

setInterval(function () {
  for (var i = 0; i < records.length; i++) {
    if (records[i].status === "running") { render(); return; }
  }
}, 1000);

render();
</script>
</body>
</html>
`

function renderPage(theme: MealieTheme): string {
  return PAGE
    .replace("__THEME_CSS__", themeCss(theme))
    .replace("__THEME_COLOR_LIGHT__", theme.light.primary)
    .replace("__THEME_COLOR_DARK__", theme.dark.primary)
    .replace("__RECIPE_URL_TEMPLATE__", JSON.stringify(config.history.recipeUrlTemplate))
}

export function historyRoutes(app: FastifyInstance): void {
  app.get("/estimator/history", async (_req, reply) => {
    const theme = await getMealieTheme()
    reply.type("text/html; charset=utf-8")
    reply.header("Cache-Control", "private, max-age=7200")
    return renderPage(theme)
  })

  app.get("/estimator/history.json", () => getHistory())

  app.get("/estimator/history/events", (req, reply) => {
    const res = reply.raw
    reply.hijack()

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    })

    clients.add(res)
    ensureSubscription()
    res.write(`data: ${JSON.stringify(getHistory())}\n\n`)

    const keepalive = setInterval(() => {
      try {
        res.write(": keepalive\n\n")
      } catch {
        // connection already gone; cleanup runs on close
      }
    }, 15000)
    keepalive.unref()

    req.raw.on("close", () => {
      clearInterval(keepalive)
      clients.delete(res)
    })
  })
}
