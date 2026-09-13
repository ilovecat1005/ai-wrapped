// 示範資料：產生 ChatGPT 匯出格式的合成對話，讓沒有匯出檔的訪客也能立刻看到完整儀表板。

export function generateDemoData() {
  const rand = mulberry32(20260914);
  const now = Date.now();
  const DAY_MS = 86400000;
  const conversations = [];
  const count = 460 + Math.floor(rand() * 40);

  const titles = [
    "Python pandas 合併兩個 dataframe 報錯", "幫我翻譯這段英文 email", "React useEffect 無限迴圈 debug",
    "解釋 transformer 的 attention 機制", "帮我写一封辞职信", "Unity 物件閃爍 shader 效果",
    "日文文法 問題：は vs が", "投資報告建議架構", "健身房菜單 三天 split", "SQL 查詢優化 like 慢",
    "debug this python script pls", "碩士論文研究方向討論", "旅遊行程 規劃 東京五天", "cover letter for internship",
    "算法题 手撕 quicksort", "作文潤稿：我的暑假", "how to center a div css", "API 串接 OAuth 流程",
    "code review my pull request", "翻譯中文合約條款", "期中考考古題練習", "email 禮貌寫法 to professor",
    "docker compose network 設定", "料理食譜 紅燒肉", "game design 文件大綱", "機器學習 作業 gradient descent",
  ];
  const models = ["gpt-4o", "gpt-4o", "gpt-4o-mini", "gpt-4o-mini", "o3", "gpt-4"];
  // 深夜偏重的時段權重（0-23）
  const hourWeights = [10, 7, 4, 2, 1, 1, 1, 2, 3, 4, 4, 5, 5, 5, 4, 4, 5, 6, 6, 7, 8, 9, 10, 10];

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.pow(rand(), 0.8) * 400);
    const hour = pickWeighted(hourWeights, rand);
    const base = now - daysAgo * DAY_MS;
    const d = new Date(base);
    d.setHours(hour, Math.floor(rand() * 60), 0, 0);
    const create = Math.floor(d.getTime() / 1000);

    const userCount = 1 + Math.floor(rand() * rand() * 9);
    const assistantCount = Math.max(1, userCount - Math.floor(rand() * 2));
    const title = titles[Math.floor(rand() * titles.length)];
    const model = models[Math.floor(rand() * models.length)];

    const mapping = { root: { id: "root", message: null, parent: null, children: ["n0"] } };
    let prev = "root";
    const addNode = (role, ts, text) => {
      const id = `n${mappingKey++}`;
      mapping[id] = {
        id,
        message: {
          author: { role },
          create_time: ts,
          content: { content_type: "text", parts: [text] },
          status: "finished_successfully",
          metadata: role === "assistant" ? { model_slug: model } : {},
        },
        parent: prev,
        children: [],
      };
      mapping[prev].children.push(id);
      prev = id;
    };
    let mappingKey = 0;
    let t = create;
    for (let k = 0; k < Math.max(userCount, assistantCount); k++) {
      t += 30 + Math.floor(rand() * 240);
      addNode("user", t, "示範訊息：請幫我處理這個問題。");
      t += 5 + Math.floor(rand() * 60);
      addNode("assistant", t, "這是示範回覆，實際資料會是你的對話內容。");
    }

    conversations.push({
      title,
      create_time: create,
      update_time: t,
      default_model_slug: model,
      conversation_id: `demo-${i}`,
      mapping,
    });
  }
  return conversations;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted(weights, rand) {
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rand() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return i;
  }
  return weights.length - 1;
}
