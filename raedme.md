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

- 支援 MP3、MP4、WAV、WebM、OGG、FLAC（最大 25 MB）
- 會議紀錄、課堂筆記、訪談摘要、精簡重點
- 顯示原始逐字稿
- 可編輯及一鍵複製 Markdown
- API 金鑰只存在伺服器端

## 測試

```bash
npm test
```
