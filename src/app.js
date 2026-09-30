import express from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const allowedAudioTypes = new Set([
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
const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const messages = {
  "zh-Hant": {
    unsupported: "僅支援 MP3、MP4、M4A、WAV、WebM、OGG 或 FLAC 音檔",
    missingAudio: "請選擇音檔",
    missingType: "請選擇筆記類型",
    invalidLanguage: "請選擇有效的輸出語言",
    unsupportedImage: "圖片僅支援 JPG、PNG、WebP 或 GIF",
    tooManyImages: "最多只能上傳 5 張圖片",
    imageTooLarge: "每張圖片不可超過 10 MB",
    tooLarge: "音檔不可超過 25 MB",
    uploadFailed: "上傳失敗",
    generationFailed: "無法產生筆記，請稍後再試",
  },
  ja: {
    unsupported: "MP3、MP4、M4A、WAV、WebM、OGG、FLAC の音声ファイルに対応しています",
    missingAudio: "音声ファイルを選択してください",
    missingType: "ノートの種類を選択してください",
    invalidLanguage: "有効な出力言語を選択してください",
    unsupportedImage: "画像は JPG、PNG、WebP、GIF に対応しています",
    tooManyImages: "画像は最大 5 枚までアップロードできます",
    imageTooLarge: "画像は 1 枚あたり 10 MB 以下にしてください",
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
    const allowed =
      file.fieldname === "audio"
        ? allowedAudioTypes.has(file.mimetype)
        : file.fieldname === "images" && allowedImageTypes.has(file.mimetype);
    const errorCode =
      file.fieldname === "images" ? "UNSUPPORTED_IMAGE" : "UNSUPPORTED_AUDIO";
    callback(allowed ? null : new Error(errorCode), allowed);
  },
});

export function createApp(noteService) {
  const app = express();

  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.use(express.static(publicDir));

  app.post(
    "/api/notes",
    upload.fields([
      { name: "audio", maxCount: 1 },
      { name: "images", maxCount: 5 },
    ]),
    async (request, response) => {
      const locale = localeFor(request);
      const text = messages[locale];
      const audio = request.files?.audio?.[0];
      const images = request.files?.images || [];

      if (!audio) {
        return response.status(400).json({ error: text.missingAudio });
      }
      if (images.some((image) => image.size > 10 * 1024 * 1024)) {
        return response.status(413).json({ error: text.imageTooLarge });
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
          file: audio,
          images,
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
    },
  );

  app.use((error, _request, response, _next) => {
    const locale = localeFor(_request);
    const text = messages[locale];
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return response.status(413).json({ error: text.tooLarge });
    }
    if (
      error instanceof multer.MulterError &&
      error.code === "LIMIT_UNEXPECTED_FILE" &&
      error.field === "images"
    ) {
      return response.status(400).json({ error: text.tooManyImages });
    }
    const message =
      error.message === "UNSUPPORTED_AUDIO"
        ? text.unsupported
        : error.message === "UNSUPPORTED_IMAGE"
          ? text.unsupportedImage
          : error.message;
    return response.status(400).json({ error: message || text.uploadFailed });
  });

  return app;
}
