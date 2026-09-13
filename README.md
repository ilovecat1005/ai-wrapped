# ✨ AI Wrapped — 你的 AI 使用回顧

![License](https://img.shields.io/badge/license-MIT-green)
![Privacy](https://img.shields.io/badge/隱私-100%25_本機計算-22d3ee)
![Dependencies](https://img.shields.io/badge/外部依賴-0-success)

> 拖放你的 ChatGPT / Claude 匯出檔，立刻看到你和 AI 相處的完整故事——**所有計算都在你的瀏覽器裡完成，資料永不上傳。**

**👉 [立即使用（GitHub Pages）](https://ilovecat1005.github.io/ai-wrapped/)** — 沒有匯出檔也可以點「示範資料」先看看長什麼樣。

## 你會看到什麼

- 📊 **總覽數字**：對話數、訊息數、你親手打了多少字、活躍天數
- 🏆 **專屬稱號**：夜貓子、週末戰士、連續鐵人、洗版王……依你的習慣自動頒發
- 📅 **活躍熱力圖**：GitHub 綠格子風格，看整整一年你什麼時候在跟 AI 聊天
- 🕐 **時間洞察**：幾點最愛用、星期分佈、每月訊息量趨勢
- 🧠 **主題分析**：你都拿 AI 做什麼（寫程式？翻譯？寫報告？）＋ 最常出現的關鍵字
- 🤖 **模型使用分佈**：GPT-4o、o3、Claude……你最依賴哪個模型
- 📸 **分享卡**：一鍵產生 1080×1350 的回顧圖卡，直接發限動、塞進履歷

## 🔒 為什麼可以放心使用

- 這個頁面**沒有任何對外網路請求**——打開 DevTools 的 Network 分頁，你會看到零請求
- 沒有 Cookie、沒有 Google Analytics、沒有字型 CDN
- 匯出檔只在你自己的瀏覽器記憶體裡解析，關掉分頁就消失
- 程式碼全部公開（MIT），歡迎自己審查或自己架一份

## 📦 怎麼拿到我的對話匯出檔？

**ChatGPT**
1. 開啟 [ChatGPT 設定](https://chat.openai.com/) → Data controls
2. 點 Export data → 收到確認信後下載 `.zip`
3. 解壓縮，把裡面的 `conversations.json` 拖進本頁

**Claude**
1. 開啟 [Claude 設定](https://claude.ai/) → Privacy → Export data
2. 下載匯出包並解壓縮
3. 把 `conversations.json` 拖進本頁

> 支援兩種格式自動偵測，不用自己選。

## 🚀 自己架一份

不需要建置工具、不需要 npm install：

```bash
git clone https://github.com/ilovecat1005/ai-wrapped.git
cd ai-wrapped
# 用任何靜態伺服器，例如：
python3 -m http.server 8080
# 打開 http://localhost:8080
```

## 🧪 開發

純 HTML / CSS / JavaScript（ES Modules），零依賴、零建置。

```
index.html   頁面結構
style.css    深色主題樣式
parser.js    格式偵測、解析與統計（含主題分類、稱號邏輯）
charts.js    手刻圖表：熱力圖、長條圖、圓餅圖、關鍵字
app.js       UI 接線與 Canvas 分享卡
demo.js      示範資料產生器
test.mjs     node test.mjs — 解析與統計的單元測試
```

跑測試：

```bash
node test.mjs
```

## 🛣 未來規劃

- [ ] 更多主題分類與更聰明的關鍵字擷取
- [ ] 英文介面
- [ ] 年度切換（挑某一年來回顧）
- [ ] 匯出 PDF 年度報告

歡迎開 [Issue](https://github.com/ilovecat1005/ai-wrapped/issues) 許願或直接 PR！

## 📄 授權

[MIT](LICENSE) © ilovecat1005 (Weber)
