import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";
import { getNoteInstruction } from "../src/note-service.js";

const fakeService = {
  async generate({ file, noteType }) {
    return {
      transcript: `transcribed:${file.originalname}`,
      markdown: `# ${noteType}\n\n- 完成`,
    };
  },
};

test("lecture prompts follow the required five-part learning portfolio", () => {
  const traditionalChinese = getNoteInstruction("zh-Hant", "lecture");
  const japanese = getNoteInstruction("ja", "lecture");

  for (const heading of [
    "上課重點",
    "作業",
    "上課心得",
    "自行蒐集的資料",
    "其他（總結）",
    "學習前後的差異",
    "學習過程與成果",
  ]) {
    assert.match(traditionalChinese, new RegExp(heading));
  }
  assert.match(traditionalChinese, /待補充/);
  assert.match(japanese, /授業の要点/);
  assert.match(japanese, /学習前後の変化/);
  assert.match(japanese, /要追記/);
});

test("GET / serves the upload page", async () => {
  const response = await request(createApp(fakeService)).get("/");
  assert.equal(response.status, 200);
  assert.match(response.text, /把聲音/);
  assert.match(response.text, /日本語/);
});

test("GET /health reports service health", async () => {
  const response = await request(createApp(fakeService)).get("/health");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: "ok" });
});

test("POST /api/notes transcribes audio and returns Markdown", async () => {
  const response = await request(createApp(fakeService))
    .post("/api/notes")
    .field("noteType", "meeting")
    .attach("audio", Buffer.from("fake audio"), {
      filename: "standup.mp3",
      contentType: "audio/mpeg",
    });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    transcript: "transcribed:standup.mp3",
    markdown: "# meeting\n\n- 完成",
  });
});

test("POST /api/notes accepts M4A recordings from mobile devices", async () => {
  const response = await request(createApp(fakeService))
    .post("/api/notes")
    .field("noteType", "summary")
    .attach("audio", Buffer.from("fake m4a"), {
      filename: "voice-memo.m4a",
      contentType: "audio/x-m4a",
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.transcript, "transcribed:voice-memo.m4a");
});

test("POST /api/notes forwards Japanese locale and output language", async () => {
  let receivedLocale;
  let receivedOutputLanguage;
  const service = {
    async generate({ locale, outputLanguage }) {
      receivedLocale = locale;
      receivedOutputLanguage = outputLanguage;
      return { transcript: "こんにちは", markdown: "# 要約" };
    },
  };
  const response = await request(createApp(service))
    .post("/api/notes?lang=ja")
    .field("locale", "ja")
    .field("outputLanguage", "ja")
    .field("noteType", "summary")
    .attach("audio", Buffer.from("fake audio"), {
      filename: "memo.m4a",
      contentType: "audio/m4a",
    });

  assert.equal(response.status, 200);
  assert.equal(receivedLocale, "ja");
  assert.equal(receivedOutputLanguage, "ja");
  assert.equal(response.body.markdown, "# 要約");
});

test("POST /api/notes requires an audio file", async () => {
  const response = await request(createApp(fakeService))
    .post("/api/notes")
    .field("noteType", "summary");

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "請選擇音檔");
});

test("POST /api/notes returns validation errors in Japanese", async () => {
  const response = await request(createApp(fakeService))
    .post("/api/notes?lang=ja")
    .field("locale", "ja")
    .field("noteType", "summary");

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "音声ファイルを選択してください");
});

test("POST /api/notes rejects invalid output languages", async () => {
  const response = await request(createApp(fakeService))
    .post("/api/notes")
    .field("noteType", "summary")
    .field("outputLanguage", "invalid")
    .attach("audio", Buffer.from("fake audio"), {
      filename: "memo.m4a",
      contentType: "audio/m4a",
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "請選擇有效的輸出語言");
});

test("POST /api/notes rejects unsupported files", async () => {
  const response = await request(createApp(fakeService))
    .post("/api/notes")
    .field("noteType", "summary")
    .attach("audio", Buffer.from("text"), {
      filename: "notes.txt",
      contentType: "text/plain",
    });

  assert.equal(response.status, 400);
  assert.match(response.body.error, /僅支援/);
});
