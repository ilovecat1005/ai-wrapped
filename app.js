// AI Wrapped — UI 接線：讀檔、解析、渲染儀表板與分享卡。
import { detectFormat, parseConversations, computeStats } from "./parser.js";
import { generateDemoData } from "./demo.js";
import {
  renderBars, renderWeekday, renderHours, renderMonthly, renderCalendar,
  renderDonut, renderKeywords, renderTopConversations, escapeHtml,
} from "./charts.js";

const $ = (id) => document.getElementById(id);
const landing = $("landing");
const dashboard = $("dashboard");
const dropzone = $("dropzone");
const fileInput = $("file-input");
const errorMsg = $("error");
const statusLine = $("status");

const CATEGORY_ORDER = ["程式開發", "翻譯與語言", "寫作與文件", "學習與研究", "生活與休閒", "其他"];
const CATEGORY_LABELS = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, c]));

// ---- 檔案輸入 ----

dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("over"); });
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("over"));
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("over");
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) readFile(file);
});
fileInput.addEventListener("change", () => {
  if (fileInput.files && fileInput.files[0]) readFile(fileInput.files[0]);
});
$("demo-btn").addEventListener("click", loadDemo);
$("restart-btn").addEventListener("click", () => {
  dashboard.hidden = true;
  landing.hidden = false;
  errorMsg.hidden = true;
  fileInput.value = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
});
$("share-btn").addEventListener("click", shareCard);

function readFile(file) {
  if (file.size > 300 * 1024 * 1024) return showError("檔案太大（超過 300MB），請確認是不是正確的匯出檔。");
  status("讀取檔案中…");
  const reader = new FileReader();
  reader.onerror = () => showError("讀取檔案失敗，請再試一次。");
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      boot(data, file.name);
    } catch {
      showError("這不是有效的 JSON 檔。請確認選的是匯出包裡的 conversations.json。");
    }
  };
  reader.readAsText(file);
}

function boot(data, sourceName) {
  const format = detectFormat(data);
  if (!format) {
    return showError("認不出這個格式。目前支援 ChatGPT 與 Claude 官方匯出的 conversations.json。");
  }
  status("分析中…");
  setTimeout(() => {
    try {
      const convs = parseConversations(data, format);
      if (convs.length === 0) return showError("解析成功，但裡面沒有包含文字的對話訊息。");
      showDashboard(convs, format, sourceName);
    } catch (err) {
      console.error(err);
      showError(`解析時發生錯誤：${err.message}`);
    }
  }, 30);
}

function loadDemo() {
  const convs = parseConversations(generateDemoData(), "chatgpt");
  showDashboard(convs, "chatgpt", "示範資料");
}

function status(text) {
  errorMsg.hidden = true;
  statusLine.textContent = text;
}

function showError(text) {
  statusLine.textContent = "";
  errorMsg.textContent = `⚠️ ${text}`;
  errorMsg.hidden = false;
}

// ---- 儀表板 ----

function showDashboard(convs, format, sourceName) {
  statusLine.textContent = "";
  errorMsg.hidden = true;
  const stats = computeStats(convs);

  $("fmt-badge").textContent = format === "chatgpt" ? "ChatGPT 匯出" : "Claude 匯出";
  $("src-line").textContent = `來源：${sourceName}・共 ${stats.conversations.toLocaleString()} 場對話`;

  setStat("stat-convs", stats.conversations.toLocaleString(), "場對話");
  setStat("stat-msgs", (stats.userMessages + stats.assistantMessages).toLocaleString(),
    "則訊息", `你送出 ${stats.userMessages.toLocaleString()} 則`);
  setStat("stat-chars", humanCount(stats.userChars), "個字", "你親手打的所有提問");
  setStat("stat-days", stats.activeDays.toLocaleString(), "天活躍",
    stats.firstAt ? `從 ${fmtDate(stats.firstAt)} 開始` : "");

  renderAwards(stats.awards);
  renderCalendar($("heatmap"), stats.daily);
  renderHours($("hours"), stats.hours);
  renderWeekday($("weekdays"), stats.weekdays);
  renderMonthly($("monthly"), stats.monthly);
  renderDonut($("donut"), categoryItems(stats));
  renderKeywords($("keywords"), stats.keywords);
  renderTopConversations($("top-convs"), stats.topConversations);

  const modelBlock = $("model-block");
  if (stats.models.size > 0) {
    renderBars($("models"), [...stats.models.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6), { unit: " 則" });
    modelBlock.hidden = false;
  } else {
    modelBlock.hidden = true;
  }

  landing.hidden = true;
  dashboard.hidden = false;
  window.scrollTo({ top: 0 });
}

function setStat(id, value, unit, sub = "") {
  $(id).innerHTML = `<span class="stat-value">${escapeHtml(value)}</span><span class="stat-unit">${escapeHtml(unit)}</span>${sub ? `<span class="stat-sub">${escapeHtml(sub)}</span>` : ""}`;
}

function humanCount(n) {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)} 億`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)} 萬`;
  return n.toLocaleString();
}

function fmtDate(ms) {
  return new Date(ms).toLocaleDateString("zh-TW", { year: "numeric", month: "numeric", day: "numeric" });
}

function renderAwards(awards) {
  const el = $("awards");
  el.innerHTML = "";
  for (const a of awards) {
    const card = document.createElement("div");
    card.className = "award";
    card.innerHTML = `<span class="award-icon">${a.icon}</span><span class="award-title">${escapeHtml(a.title)}</span><span class="award-detail">${escapeHtml(a.detail)}</span>`;
    el.append(card);
  }
}

function categoryItems(stats) {
  return CATEGORY_ORDER
    .map((name) => ({ label: CATEGORY_LABELS[name], value: stats.categories.get(name) || 0 }))
    .filter((i) => i.value > 0)
    .sort((a, b) => b.value - a.value);
}

// ---- 分享卡（Canvas 產生 PNG） ----

function shareCard() {
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, 1080, 1350);
  grad.addColorStop(0, "#0b0f19"); grad.addColorStop(0.55, "#141a33"); grad.addColorStop(1, "#1d1440");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1350);

  ctx.fillStyle = "rgba(124,92,255,0.25)";
  ctx.beginPath(); ctx.arc(950, 150, 260, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(34,211,238,0.18)";
  ctx.beginPath(); ctx.arc(120, 1200, 300, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "#e8ecf8";
  ctx.font = "bold 84px system-ui, 'PingFang TC', 'Microsoft JhengHei', sans-serif";
  ctx.fillText("我的 AI Wrapped", 90, 190);
  ctx.fillStyle = "#8b94ad";
  ctx.font = "36px system-ui, 'PingFang TC', 'Microsoft JhengHei', sans-serif";
  ctx.fillText("我和 AI 相處的紀錄・本機統計", 90, 250);

  const readValue = (id) => $(id).textContent;
  const rows = [
    ["場對話", readValue("stat-convs")],
    ["則訊息", readValue("stat-msgs")],
    ["你打的字", `${readValue("stat-chars")} 字`],
    ["活躍天數", `${readValue("stat-days")} 天`],
  ];
  rows.forEach(([label, value], i) => {
    const y = 430 + Math.floor(i / 2) * 220;
    const x = 90 + (i % 2) * 470;
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    roundRect(ctx, x, y - 110, 430, 170, 24); ctx.fill();
    ctx.fillStyle = "#22d3ee";
    ctx.font = "bold 72px system-ui, 'PingFang TC', 'Microsoft JhengHei', sans-serif";
    ctx.fillText(value.split(" ")[0], x + 36, y + 10);
    ctx.fillStyle = "#8b94ad";
    ctx.font = "32px system-ui, 'PingFang TC', 'Microsoft JhengHei', sans-serif";
    ctx.fillText(label, x + 36, y + 48);
  });

  const awards = [...document.querySelectorAll("#awards .award-title")].map((el) => el.textContent).slice(0, 3);
  ctx.fillStyle = "#e8ecf8";
  ctx.font = "bold 44px system-ui, 'PingFang TC', 'Microsoft JhengHei', sans-serif";
  ctx.fillText("你的稱號", 90, 950);
  ctx.font = "40px system-ui, 'PingFang TC', 'Microsoft JhengHei', sans-serif";
  ctx.fillStyle = "#c7cffb";
  awards.forEach((a, i) => ctx.fillText(`★ ${a}`, 90, 1020 + i * 62));

  ctx.fillStyle = "#8b94ad";
  ctx.font = "30px system-ui, 'PingFang TC', 'Microsoft JhengHei', sans-serif";
  ctx.fillText("AI Wrapped · ilovecat1005.github.io/ai-wrapped", 90, 1280);

  const link = document.createElement("a");
  link.download = "ai-wrapped.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
