// AI Wrapped — 格式偵測、解析與統計。全部在本機執行，沒有任何網路請求。

export function detectFormat(data) {
  if (!Array.isArray(data) || data.length === 0) return null;
  const sample = data.slice(0, 50);
  if (sample.some((c) => c && typeof c === "object" && "mapping" in c)) return "chatgpt";
  if (sample.some((c) => c && typeof c === "object" && "chat_messages" in c)) return "claude";
  return null;
}

// 統一時間戳：ChatGPT 是 unix 秒（float），Claude 是 ISO 字串（可能帶微秒）。
export function tsToMs(value) {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value * 1000);
  if (typeof value === "string") {
    const normalized = value.replace(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.(\d+)/, (_, sec, frac) => `${sec}.${frac.slice(0, 3)}`);
    const ms = Date.parse(normalized);
    if (!Number.isNaN(ms)) return ms;
  }
  return null;
}

export function parseConversations(data, format) {
  const items = Array.isArray(data) ? data : [];
  const convs = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const conv = format === "chatgpt" ? parseChatGPT(raw) : parseClaude(raw);
    if (conv && conv.messages.length > 0) convs.push(conv);
  }
  convs.sort((a, b) => (a.createdAt ?? a.updatedAt ?? 0) - (b.createdAt ?? b.updatedAt ?? 0));
  return convs;
}

function parseChatGPT(conv) {
  const messages = [];
  let model = null;
  for (const node of Object.values(conv.mapping || {})) {
    const m = node && node.message;
    if (!m) continue;
    const role = m.author && m.author.role;
    if (role !== "user" && role !== "assistant") continue;
    const parts = (m.content && Array.isArray(m.content.parts)) ? m.content.parts : [];
    const text = parts.filter((p) => typeof p === "string").join("\n").trim();
    if (!text) continue;
    if (role === "assistant" && !model) model = (m.metadata && m.metadata.model_slug) || null;
    messages.push({ role, ts: tsToMs(m.create_time), text });
  }
  messages.sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
  return {
    title: (conv.title || "").trim() || "未命名對話",
    createdAt: tsToMs(conv.create_time),
    updatedAt: tsToMs(conv.update_time),
    model: model || conv.default_model_slug || null,
    messages,
  };
}

function parseClaude(conv) {
  let model = conv.model || null;
  const messages = [];
  for (const m of Array.isArray(conv.chat_messages) ? conv.chat_messages : []) {
    const role = m.sender === "human" ? "user" : m.sender === "assistant" ? "assistant" : null;
    if (!role) continue;
    const text = claudeMessageText(m);
    if (!text) continue;
    if (role === "assistant" && !model) model = m.model || null;
    messages.push({ role, ts: tsToMs(m.created_at), text });
  }
  return {
    title: (conv.name || "").trim() || "未命名對話",
    createdAt: tsToMs(conv.created_at),
    updatedAt: tsToMs(conv.updated_at),
    model,
    messages,
  };
}

function claudeMessageText(m) {
  if (typeof m.text === "string" && m.text.trim()) return m.text.trim();
  if (Array.isArray(m.content)) {
    return m.content
      .filter((b) => b && b.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("\n")
      .trim();
  }
  return "";
}

// ---- 主題分類（依對話標題比對） ----

const CATEGORY_RULES = [
  ["程式開發", ["code", "bug", "error", "python", "javascript", "typescript", "java", "api", "function", "react", "vue", "css", "html", "sql", "git", "docker", "regex", "script", "debug", "unity", "shader", "程式", "除錯", "報錯", "函式", "語法", "編譯", "爬蟲", "資料庫", "演算法", "部署"]],
  ["翻譯與語言", ["translate", "translation", "english", "japanese", "korean", "grammar", "翻譯", "英文", "日文", "韓文", "文法", "單字", "發音", "口說"]],
  ["寫作與文件", ["essay", "email", "letter", "resume", "report", "proposal", "文案", "報告", "履歷", "信件", "投稿", "簡報", "潤稿", "作文", "自傳"]],
  ["學習與研究", ["explain", "study", "exam", "paper", "research", "homework", "quiz", "學習", "考試", "考古", "論文", "研究", "作業", "筆記", "複習", "題目", "解釋", "教我"]],
  ["生活與休閒", ["recipe", "travel", "movie", "game", "music", "health", "食譜", "旅遊", "電影", "遊戲", "音樂", "健康", "健身", "料理", "購物"]],
];
const OTHER_CATEGORY = "其他";

export function classifyTitle(title) {
  const t = (title || "").toLowerCase();
  if (!t) return OTHER_CATEGORY;
  for (const [name, words] of CATEGORY_RULES) {
    for (const w of words) {
      if (t.includes(w)) return name;
    }
  }
  return OTHER_CATEGORY;
}

const KEYWORD_STOP = new Set([
  "the", "and", "for", "with", "how", "what", "can", "you", "your", "please", "help",
  "的", "了", "是", "我", "你", "要", "在", "和", "跟", "嗎", "請", "用", "做", "幫",
  "怎麼", "如何", "什麼", "一個", "我的", "你的", "可以", "使用",
]);

export function extractKeywords(titles, limit = 12) {
  const counts = new Map();
  const bump = (key) => counts.set(key, (counts.get(key) || 0) + 1);
  for (const raw of titles) {
    const title = (raw || "").toLowerCase();
    for (const word of title.match(/[a-z][a-z0-9+#.]{2,}/g) || []) {
      if (!KEYWORD_STOP.has(word)) bump(word);
    }
    for (const run of title.match(/[\u4e00-\u9fff]+/g) || []) {
      if (run.length === 1) continue;
      if (run.length <= 3) { if (!KEYWORD_STOP.has(run)) bump(run); continue; }
      for (let i = 0; i < run.length - 1; i++) {
        const gram = run.slice(i, i + 2);
        if (!KEYWORD_STOP.has(gram)) bump(gram);
      }
    }
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, n]) => ({ word, count: n }));
}

// ---- 統計 ----

const DAY_MS = 86400000;

export function computeStats(convs) {
  const stats = {
    conversations: convs.length,
    userMessages: 0,
    assistantMessages: 0,
    userChars: 0,
    firstAt: null,
    lastAt: null,
    hours: new Array(24).fill(0),
    weekdays: new Array(7).fill(0),
    daily: new Map(),   // "YYYY-MM-DD" -> 使用者訊息數
    monthly: new Map(), // "YYYY-MM" -> 使用者訊息數
    models: new Map(),  // model -> assistant 訊息數
    categories: new Map(),
    keywords: [],
    topConversations: [],
    maxDay: null,
    longestStreak: 0,
  };

  for (const conv of convs) {
    stats.categories.set(classifyTitle(conv.title), (stats.categories.get(classifyTitle(conv.title)) || 0) + 1);
    for (const msg of conv.messages) {
      if (msg.role === "user") {
        stats.userMessages += 1;
        stats.userChars += msg.text.length;
      } else {
        stats.assistantMessages += 1;
        const model = conv.model || "未知";
        stats.models.set(model, (stats.models.get(model) || 0) + 1);
      }
      const ts = msg.ts ?? conv.createdAt ?? conv.updatedAt;
      if (ts == null) continue;
      const d = new Date(ts);
      stats.hours[d.getHours()] += 1;
      stats.weekdays[d.getDay()] += 1;
      if (msg.role === "user") {
        const key = dateKey(d);
        stats.daily.set(key, (stats.daily.get(key) || 0) + 1);
        const month = key.slice(0, 7);
        stats.monthly.set(month, (stats.monthly.get(month) || 0) + 1);
      }
      if (stats.firstAt == null || ts < stats.firstAt) stats.firstAt = ts;
      if (stats.lastAt == null || ts > stats.lastAt) stats.lastAt = ts;
    }
  }

  stats.keywords = extractKeywords(convs.map((c) => c.title));
  stats.topConversations = [...convs]
    .sort((a, b) => b.messages.length - a.messages.length)
    .slice(0, 5)
    .map((c) => ({ title: c.title, messages: c.messages.length }));

  let maxCount = 0;
  for (const [key, n] of stats.daily) {
    if (n > maxCount) { maxCount = n; stats.maxDay = { date: key, count: n }; }
  }
  stats.activeDays = stats.daily.size;
  stats.longestStreak = longestStreak(stats.daily);
  stats.awards = buildAwards(stats);
  return stats;
}

function dateKey(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function longestStreak(daily) {
  const keys = [...daily.keys()].sort();
  if (keys.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < keys.length; i++) {
    const prev = new Date(keys[i - 1] + "T00:00:00");
    const cur = new Date(keys[i] + "T00:00:00");
    if (Math.round((cur - prev) / DAY_MS) === 1) { run += 1; best = Math.max(best, run); }
    else run = 1;
  }
  return best;
}

function buildAwards(stats) {
  const awards = [];
  const totalHourMsgs = stats.hours.reduce((a, b) => a + b, 0) || 1;
  const share = (from, to) => {
    let n = 0;
    for (let h = from; h <= to; h++) n += stats.hours[h % 24];
    return n / totalHourMsgs;
  };
  const night = share(22, 23) + share(0, 4);
  const morning = share(5, 9);
  if (night >= 0.3) awards.push({ icon: "🦉", title: "夜貓子", detail: `${Math.round(night * 100)}% 的訊息在深夜與凌晨送出` });
  else if (morning >= 0.25) awards.push({ icon: "🌅", title: "早鳥型玩家", detail: `${Math.round(morning * 100)}% 的訊息在清晨到早上送出` });

  let weekend = 0;
  for (let d = 0; d < 7; d++) if (d === 0 || d === 6) weekend += stats.weekdays[d];
  const weekendShare = weekend / (stats.weekdays.reduce((a, b) => a + b, 0) || 1);
  if (weekendShare >= 0.38) awards.push({ icon: "🏖️", title: "週末戰士", detail: `${Math.round(weekendShare * 100)}% 的訊息發生在週末` });

  if (stats.maxDay && stats.maxDay.count >= 50) awards.push({ icon: "🔥", title: "洗版王", detail: `單日最多 ${stats.maxDay.count} 則訊息（${stats.maxDay.date}）` });
  if (stats.longestStreak >= 14) awards.push({ icon: "📅", title: "連續鐵人", detail: `最長連續 ${stats.longestStreak} 天都有使用` });

  const avg = stats.userMessages / Math.max(1, stats.conversations);
  if (avg >= 12) awards.push({ icon: "🧗", title: "深挖型選手", detail: `平均每場對話送出 ${avg.toFixed(1)} 則訊息` });
  else if (stats.conversations >= 300) awards.push({ icon: "🚀", title: "高頻用戶", detail: `累積 ${stats.conversations} 場對話` });

  if (awards.length === 0) awards.push({ icon: "🌱", title: "AI 新芽", detail: "使用紀錄還很新，繼續累積會更有趣！" });
  return awards.slice(0, 4);
}
