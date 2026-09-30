import express from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const allowedTypes = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
]);

const messages = {
  "zh-Hant": {
    unsupported: "僅支援 MP3、MP4、M4A、WAV、WebM、OGG 或 FLAC 音檔",
    missingAudio: "請選擇音檔",
    missingType: "請選擇筆記類型",
    invalidLanguage: "請選擇有效的輸出語言",
    tooLarge: "音檔不可超過 25 MB",
    uploadFailed: "上傳失敗",
    generationFailed: "無法產生筆記，請稍後再試",
  },
  ja: {
    unsupported: "MP3、MP4、M4A、WAV、WebM、OGG、FLAC の音声ファイルに対応しています",
    missingAudio: "音声ファイルを選択してください",
    missingType: "ノートの種類を選択してください",
    invalidLanguage: "有効な出力言語を選択してください",
    tooLarge: "音声ファイルは 25 MB 以下にしてください",
    uploadFailed: "アップロードに失敗しました",
    generationFailed: "ノートを作成できませんでした。しばらくしてからもう一度お試しください",
  },
};

function localeFor(request) {
  return request.body?.locale === "ja" || request.query.lang === "ja"
    ? "ja"
    : "zh-Hant";
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    callback(
      allowedTypes.has(file.mimetype)
        ? null
        : new Error("UNSUPPORTED_AUDIO"),
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
    const locale = localeFor(request);
    const text = messages[locale];

    if (!request.file) {
      return response.status(400).json({ error: text.missingAudio });
    }

    const noteType = request.body.noteType?.trim();
    if (!noteType) {
      return response.status(400).json({ error: text.missingType });
    }

    const outputLanguage = request.body.outputLanguage || "original";
    if (!["original", "zh-Hant", "ja"].includes(outputLanguage)) {
      return response.status(400).json({ error: text.invalidLanguage });
    }

    try {
      const result = await noteService.generate({
        file: request.file,
        noteType,
        locale,
        outputLanguage,
      });
      return response.json(result);
    } catch (error) {
      console.error("產生筆記失敗", error);
      return response.status(502).json({
        error: error?.message || text.generationFailed,
      });
    }
  });

  app.use((error, _request, response, _next) => {
    const locale = localeFor(_request);
    const text = messages[locale];
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return response.status(413).json({ error: text.tooLarge });
    }
    const message =
      error.message === "UNSUPPORTED_AUDIO" ? text.unsupported : error.message;
    return response.status(400).json({ error: message || text.uploadFailed });
  });

  return app;
}
