import express from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const allowedTypes = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    callback(
      allowedTypes.has(file.mimetype)
        ? null
        : new Error("僅支援 MP3、MP4、WAV、WebM、OGG 或 FLAC 音檔"),
      allowedTypes.has(file.mimetype),
    );
  },
});

export function createApp(noteService) {
  const app = express();

  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.use(express.static(publicDir));

  app.post("/api/notes", upload.single("audio"), async (request, response) => {
    if (!request.file) {
      return response.status(400).json({ error: "請選擇音檔" });
    }

    const noteType = request.body.noteType?.trim();
    if (!noteType) {
      return response.status(400).json({ error: "請選擇筆記類型" });
    }

    try {
      const result = await noteService.generate({
        file: request.file,
        noteType,
      });
      return response.json(result);
    } catch (error) {
      console.error("產生筆記失敗", error);
      return response.status(502).json({
        error: error?.message || "無法產生筆記，請稍後再試",
      });
    }
  });

  app.use((error, _request, response, _next) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return response.status(413).json({ error: "音檔不可超過 25 MB" });
    }
    return response.status(400).json({ error: error.message || "上傳失敗" });
  });

  return app;
}
