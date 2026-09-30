import OpenAI, { toFile } from "openai";

const instructions = {
  "zh-Hant": {
    meeting: "整理成會議紀錄，包含摘要、討論重點、決策與待辦事項（附負責人和期限，未知則標示待確認）。",
    lecture: "整理成課堂筆記，包含主題概覽、核心概念、重要細節、例子與複習問題。",
    interview: "整理成訪談筆記，包含受訪者觀點、重要引言、主題洞察與後續追蹤。",
    summary: "整理成精簡摘要，包含三行摘要、關鍵重點與下一步。",
  },
  ja: {
    meeting: "議事録として、要約、主な議論、決定事項、アクションアイテム（担当者と期限。不明な場合は「要確認」）を整理してください。",
    lecture: "講義ノートとして、概要、主要な概念、重要な詳細、例、復習問題を整理してください。",
    interview: "インタビューノートとして、話者の見解、重要な引用、主な洞察、フォローアップ項目を整理してください。",
    summary: "簡潔なノートとして、3行の要約、重要ポイント、次のステップを整理してください。",
  },
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
    async generate({
      file,
      noteType,
      locale = "zh-Hant",
      outputLanguage = "original",
    }) {
      const audio = await toFile(file.buffer, file.originalname, {
        type: file.mimetype,
      });
      const transcription = await client.audio.transcriptions.create({
        file: audio,
        model: transcriptionModel,
      });
      const originalTranscript = transcription.text?.trim();

      if (!originalTranscript) {
        throw new Error(
          locale === "ja"
            ? "音声を認識できませんでした"
            : "音檔中沒有可辨識的語音",
        );
      }

      const resultLocale =
        outputLanguage === "original" ? locale : outputLanguage;
      const language = resultLocale === "ja" ? "日本語" : "繁體中文";
      let transcript = originalTranscript;

      if (outputLanguage !== "original") {
        const translation = await client.responses.create({
          model: notesModel,
          instructions: `音声の文字起こしを${language}に翻訳してください。固有名詞、数値、話者名、改行、発言の意味を正確に保ってください。説明やコードフェンスを追加せず、翻訳した文字起こしだけを出力してください。`,
          input: originalTranscript,
        });
        transcript = translation.output_text.trim();
      }

      const prompts =
        instructions[resultLocale] || instructions["zh-Hant"];
      const response = await client.responses.create({
        model: notesModel,
        instructions: `あなたはプロのノート作成アシスタントです。出力は必ず${language}にしてください。文字起こしの内容だけを使用し、情報を捏造しないでください。有効な Markdown をコードフェンスなしで出力してください。`,
        input: `${prompts[noteType] || prompts.summary}\n\n文字起こし / 逐字稿：\n${transcript}`,
      });

      return {
        transcript,
        ...(outputLanguage === "original" ? {} : { originalTranscript }),
        markdown: response.output_text.trim(),
      };
    },
  };
}
