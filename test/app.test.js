import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";

const fakeService = {
  async generate({ file, noteType }) {
    return {
      transcript: `transcribed:${file.originalname}`,
      markdown: `# ${noteType}\n\n- 完成`,
    };
  },
};

test("GET / serves the upload page", async () => {
  const response = await request(createApp(fakeService)).get("/");
  assert.equal(response.status, 200);
  assert.match(response.text, /把聲音/);
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

test("POST /api/notes requires an audio file", async () => {
  const response = await request(createApp(fakeService))
    .post("/api/notes")
    .field("noteType", "summary");

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "請選擇音檔");
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
