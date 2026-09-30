import OpenAI, { toFile } from "openai";

const instructions = {
  meeting: "整理成會議紀錄，包含摘要、討論重點、決策與待辦事項（附負責人和期限，未知則標示待確認）。",
  lecture: "整理成課堂筆記，包含主題概覽、核心概念、重要細節、例子與複習問題。",
  interview: "整理成訪談筆記，包含受訪者觀點、重要引言、主題洞察與後續追蹤。",
  summary: "整理成精簡摘要，包含三行摘要、關鍵重點與下一步。",
};

export function createNoteService({
  apiKey = process.env.OPENAI_API_KEY,
  transcriptionModel = process.env.STT_MODEL || "gpt-4o-mini-transcribe",
  notesModel = process.env.NOTES_MODEL || "gpt-5-mini",
} = {}) {
  if (!apiKey) {
    throw new Error("缺少 OPENAI_API_KEY");
  }

  const client = new OpenAI({ apiKey });

  return {
    async generate({ file, noteType }) {
      const audio = await toFile(file.buffer, file.originalname, {
        type: file.mimetype,
      });
      const transcription = await client.audio.transcriptions.create({
        file: audio,
        model: transcriptionModel,
      });
      const transcript = transcription.text?.trim();

      if (!transcript) {
        throw new Error("音檔中沒有可辨識的語音");
      }

      const response = await client.responses.create({
        model: notesModel,
        instructions:
          "你是專業繁體中文筆記助理。只能根據逐字稿整理，不得捏造資訊。輸出有效 Markdown，不要使用程式碼圍欄。",
        input: `${instructions[noteType] || instructions.summary}\n\n逐字稿：\n${transcript}`,
      });

      return {
        transcript,
        markdown: response.output_text.trim(),
      };
    },
  };
}
