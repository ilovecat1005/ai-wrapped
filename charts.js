// AI Wrapped — 手刻圖表渲染（純 DOM / SVG，無外部依賴）。

export function renderBars(el, entries, { unit = "" } = {}) {
  el.innerHTML = "";
  const max = Math.max(...entries.map(([, v]) => v), 1);
  for (const [label, value] of entries) {
    const col = document.createElement("div");
    col.className = "bar-col";
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = `${Math.max(3, (value / max) * 100)}%`;
    bar.title = `${label}：${value.toLocaleString()}${unit}`;
    const count = document.createElement("span");
    count.className = "bar-value";
    count.textContent = value > 0 ? value.toLocaleString() : "";
    const name = document.createElement("span");
    name.className = "bar-label";
    name.textContent = label;
    col.append(bar, count, name);
    el.append(col);
  }
}

const WEEKDAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];

export function renderWeekday(el, weekdays) {
  renderBars(el, weekdays.map((v, i) => [WEEKDAY_NAMES[i], v]), { unit: " 則" });
}

export function renderHours(el, hours) {
  renderBars(el, hours.map((v, h) => [`${String(h).padStart(2, "0")}`, v]), { unit: " 則" });
  el.classList.add("hours");
}

export function renderMonthly(el, monthly) {
  const keys = [...monthly.keys()].sort().slice(-12);
  const labels = keys.map((k) => `${Number(k.slice(5, 7))}月`);
  renderBars(el, keys.map((k, i) => [labels[i], monthly.get(k)]), { unit: " 則" });
}

export function renderCalendar(el, daily) {
  el.innerHTML = "";
  if (daily.size === 0) return;
  const dates = [...daily.keys()].map((k) => new Date(k + "T00:00:00")).sort((a, b) => a - b);
  const last = dates[dates.length - 1];
  const weeks = 53;
  const max = Math.max(...daily.values(), 1);

  const grid = document.createElement("div");
  grid.className = "heatmap";
  const start = new Date(last);
  start.setDate(start.getDate() - (weeks - 1) * 7 - ((start.getDay() + 6) % 7));

  // 對齊星期一開頭的欄位
  const columns = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + w * 7 + d);
      col.push(day);
    }
    columns.push(col);
  }

  for (const col of columns) {
    const colEl = document.createElement("div");
    colEl.className = "heatmap-col";
    for (const day of col) {
      const key = dateKey(day);
      const cell = document.createElement("div");
      cell.className = "heatmap-cell";
      const count = daily.get(key) || 0;
      const level = count === 0 ? 0 : Math.min(4, Math.ceil((count / max) * 4));
      cell.classList.add(`l${level}`);
      if (count > 0) cell.title = `${key}：${count} 則`;
      colEl.append(cell);
    }
    grid.append(colEl);
  }
  el.append(grid);
}

const DONUT_COLORS = ["#7c5cff", "#22d3ee", "#f472b6", "#facc15", "#34d399", "#94a3b8"];

export function renderDonut(el, items) {
  el.innerHTML = "";
  const total = items.reduce((a, b) => a + b.value, 0);
  if (total === 0) return;
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 120 120");
  svg.classList.add("donut");

  const C = 2 * Math.PI * 42;
  let offset = 0;
  items.forEach((item, i) => {
    const frac = item.value / total;
    if (frac <= 0) return;
    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", "60"); circle.setAttribute("cy", "60"); circle.setAttribute("r", "42");
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", DONUT_COLORS[i % DONUT_COLORS.length]);
    circle.setAttribute("stroke-width", "18");
    circle.setAttribute("stroke-dasharray", `${frac * C} ${C}`);
    circle.setAttribute("stroke-dashoffset", `${-offset * C}`);
    circle.setAttribute("transform", "rotate(-90 60 60)");
    circle.setAttribute("stroke-linecap", "butt");
    svg.append(circle);
    offset += frac;
  });
  el.append(svg);

  const legend = document.createElement("ul");
  legend.className = "legend";
  items.forEach((item, i) => {
    const li = document.createElement("li");
    const pct = Math.round((item.value / total) * 100);
    li.innerHTML = `<span class="dot" style="background:${DONUT_COLORS[i % DONUT_COLORS.length]}"></span>${escapeHtml(item.label)} <b>${pct}%</b>`;
    legend.append(li);
  });
  el.append(legend);
}

export function renderKeywords(el, keywords) {
  el.innerHTML = "";
  if (keywords.length === 0) {
    el.innerHTML = '<p class="muted">標題裡沒有足夠的關鍵字，試試多聊幾場再回來看！</p>';
    return;
  }
  const max = keywords[0].count;
  for (const { word, count } of keywords) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.style.fontSize = `${0.8 + (count / max) * 0.55}rem`;
    chip.textContent = `${word} ×${count}`;
    el.append(chip);
  }
}

export function renderTopConversations(el, top) {
  el.innerHTML = "";
  const ol = document.createElement("ol");
  ol.className = "top-list";
  for (const c of top) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="top-title">${escapeHtml(c.title)}</span><b>${c.messages} 則</b>`;
    ol.append(li);
  }
  el.append(ol);
}

function dateKey(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
