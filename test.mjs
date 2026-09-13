// AI Wrapped — 解析與統計的本地測試：node test.mjs
import { detectFormat, parseConversations, computeStats, classifyTitle } from "./parser.js";
import { generateDemoData } from "./demo.js";

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) { failures += 1; console.error(`✗ ${name}\n   expected: ${JSON.stringify(expected)}\n   actual:   ${JSON.stringify(actual)}`); }
  else console.log(`✓ ${name}`);
}
function assert(name, cond) {
  if (!cond) { failures += 1; console.error(`✗ ${name}`); }
  else console.log(`✓ ${name}`);
}

// ---- ChatGPT fixture ----
// 2024-03-10 08:00 +08:00 local（測試機時區無關：只驗證訊息數與分類，小時統計用相對位置驗證）
const T1 = Date.UTC(2024, 2, 10, 0, 0, 0) / 1000; // 08:00 台北
const chatgpt = [
  {
    title: "Python debug 除錯",
    create_time: T1,
    update_time: T1 + 600,
    default_model_slug: "gpt-4o",
    mapping: {
      root: { id: "root", message: null, parent: null, children: [] },
      n1: { id: "n1", message: { author: { role: "system" }, content: { parts: ["You are helpful"] } }, parent: "root", children: [] },
      n2: { id: "n2", message: { author: { role: "user" }, create_time: T1, content: { parts: ["my code fails"] } }, parent: "root", children: [] },
      n3: { id: "n3", message: { author: { role: "assistant" }, create_time: T1 + 30, content: { parts: ["check logs"] }, metadata: { model_slug: "gpt-4o" } }, parent: "n2", children: [] },
      n4: { id: "n4", message: null, parent: "n3", children: [] },
      n5: { id: "n5", message: { author: { role: "user" }, create_time: T1 + 60, content: { content_type: "multimodal", parts: [{}, "here is trace"] } }, parent: "n3", children: [] },
      n6: { id: "n6", message: { author: { role: "user" }, create_time: T1 + 86400, content: { parts: ["thanks"] } }, parent: "n5", children: [] },
    },
  },
  { title: "翻譯 English email", create_time: T1 + 86400, update_time: T1 + 86500, mapping: { root: { message: null } } }, // 空對話應被丟棄
];

assert("detect ChatGPT", detectFormat(chatgpt) === "chatgpt");
const convsGPT = parseConversations(chatgpt, "chatgpt");
check("empty conversation dropped", convsGPT.length, 1);
check("messages parsed", convsGPT[0].messages.length, 4);
check("model from metadata", convsGPT[0].model, "gpt-4o");
const statsGPT = computeStats(convsGPT);
check("user messages", statsGPT.userMessages, 3);
check("assistant messages", statsGPT.assistantMessages, 1);
check("chars", statsGPT.userChars, ("my code fails" + "here is trace" + "thanks").length);
check("classify program", classifyTitle("Python debug 除錯"), "程式開發");
check("classify translate", classifyTitle("翻譯 English email"), "翻譯與語言");
assert("daily spans 2 days", statsGPT.daily.size === 2);

// ---- Claude fixture ----
const claude = [
  {
    uuid: "c1",
    name: "幫我規劃 東京旅遊",
    created_at: "2025-01-15T09:30:00.123456Z",
    updated_at: "2025-01-15T10:00:00Z",
    chat_messages: [
      { sender: "human", created_at: "2025-01-15T09:30:00.123456Z", text: "五天行程" },
      { sender: "assistant", created_at: "2025-01-15T09:30:30Z", content: [{ type: "text", text: "好的" }] },
    ],
  },
];
assert("detect Claude", detectFormat(claude) === "claude");
const convsClaude = parseConversations(claude, "claude");
check("claude messages", convsClaude[0].messages.length, 2);
check("claude title", convsClaude[0].title, "幫我規劃 東京旅遊");
const statsClaude = computeStats(convsClaude);
check("claude classify", statsClaude.categories.get("生活與休閒"), 1);
assert("microsecond timestamp parsed", statsClaude.firstAt === Date.parse("2025-01-15T09:30:00.123Z"));

// ---- 格式錯誤 ----
assert("reject bad format", detectFormat([{ hello: 1 }]) === null);
assert("reject non-array", detectFormat({ a: 1 }) === null);

// ---- 示範資料可以走完整條 pipeline ----
const demoConvs = parseConversations(generateDemoData(), "chatgpt");
assert("demo conversations generated", demoConvs.length > 300);
const demoStats = computeStats(demoConvs);
assert("demo has user messages", demoStats.userMessages > 300);
assert("demo has awards", demoStats.awards.length >= 1 && demoStats.awards.length <= 4);
assert("demo heatmap data", demoStats.daily.size > 100);
assert("demo has keywords or categories", demoStats.keywords.length > 0 || demoStats.categories.size > 0);

if (failures > 0) { console.error(`\n${failures} test(s) failed`); process.exit(1); }
console.log("\nAll tests passed ✅");
