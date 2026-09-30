# Audio Notes MVP

上傳音檔，以 OpenAI STT 轉成逐字稿，再依指定格式產生 Markdown 筆記。

## 執行

需求：Node.js 20+、OpenAI API Key。

```bash
npm install
cp .env.example .env
# 編輯 .env，填入 OPENAI_API_KEY
npm run dev
```

開啟 <http://localhost:3000>。

## 功能

- 支援 MP3、MP4、M4A、WAV、WebM、OGG、FLAC（最大 25 MB）
- 完整繁體中文／日文介面，並以所選語言產生筆記
- 會議紀錄、課堂筆記、訪談摘要、精簡重點
- 顯示原始逐字稿
- 可編輯及一鍵複製 Markdown
- API 金鑰只存在伺服器端

## 測試

```bash
npm test
```

## 用手機部署到 Render

1. 用手機瀏覽器開啟 [Render Dashboard](https://dashboard.render.com/) 並以 GitHub 登入。
2. 選擇 **New > Blueprint**。
3. 連結此 GitHub 儲存庫，Render 會自動讀取 `render.yaml`。
4. 在提示畫面填入 `OPENAI_API_KEY`，再按 **Apply**。
5. 部署完成後，開啟 Render 提供的網址即可使用。

免費方案閒置後會休眠，因此第一次開啟可能需要等待約一分鐘。API Key
只會儲存在 Render 的伺服器環境變數，不會傳給瀏覽器。

### 為何此版本優先使用 Render

Vercel Functions 可執行 Node.js，但請求本文與執行時間限制不利於較大的音檔上傳及
STT 長任務。Render 直接執行常駐 Express 服務，較符合此 MVP 的 25 MB 上傳設計。
