import OpenAI, { toFile } from "openai";

const instructions = {
  "zh-Hant": {
    meeting: "整理成會議紀錄，包含摘要、討論重點、決策與待辦事項（附負責人和期限，未知則標示待確認）。",
    lecture: `整理成「學習歷程、隨堂筆記」，必須使用以下結構：
1. 上課重點：整理核心概念、重要細節與例子。
2. 作業：列出作業內容、要求與期限。
3. 上課心得：呈現理解、疑問、反思與自身想法的提升。
4. 自行蒐集的資料：整理錄音中提到的延伸資料、來源或可繼續查找的方向。
5. 其他（總結）：總結本堂課收穫與後續行動。
最後另外加入「學習前後的差異」及「學習過程與成果」，具體呈現認知或想法如何改變，並列出可藉由觀摩同學優良筆記延伸的構思。錄音未提及的項目必須標示「待補充」，不得捏造。`,
    interview: "整理成訪談筆記，包含受訪者觀點、重要引言、主題洞察與後續追蹤。",
    summary: "整理成精簡摘要，包含三行摘要、關鍵重點與下一步。",
  },
  ja: {
    meeting: "議事録として、要約、主な議論、決定事項、アクションアイテム（担当者と期限。不明な場合は「要確認」）を整理してください。",
    lecture: `「学習ポートフォリオ・授業ノート」として、必ず以下の構成で整理してください：
1. 授業の要点：主要な概念、重要な詳細、例を整理する。
2. 課題：課題の内容、要件、期限を記載する。
3. 授業の感想：理解したこと、疑問、振り返り、自分の考えの深まりを示す。
4. 自分で収集した資料：音声で言及された関連資料、出典、今後調べる方向を整理する。
5. その他（まとめ）：授業で得たことと次のアクションをまとめる。
最後に「学習前後の変化」と「学習の過程と成果」を加え、認識や考えがどのように変化したかを具体的に示し、他の学生の優れたノートから発展できるアイデアを挙げてください。音声で言及されていない項目は、捏造せず「要追記」と明記してください。`,
    interview: "インタビューノートとして、話者の見解、重要な引用、主な洞察、フォローアップ項目を整理してください。",
    summary: "簡潔なノートとして、3行の要約、重要ポイント、次のステップを整理してください。",
  },
};

export function getNoteInstruction(locale, noteType) {
  const prompts = instructions[locale] || instructions["zh-Hant"];
  return prompts[noteType] || prompts.summary;
}

export function buildNoteInput(instruction, transcript, images = []) {
  return [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: `${instruction}\n\n文字起こし / 逐字稿：\n${transcript}\n\n添付画像がある場合は、スライド、板書、教材、課題の内容を追加の根拠として分析してください。`,
        },
        ...images.map((image) => ({
          type: "input_image",
          image_url: `data:${image.mimetype};base64,${image.buffer.toString("base64")}`,
          detail: "auto",
        })),
      ],
    },
  ];
}

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
      images = [],
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

      const response = await client.responses.create({
        model: notesModel,
        instructions: `あなたはプロのノート作成アシスタントです。出力は必ず${language}にしてください。文字起こしと添付画像の内容だけを根拠として使用し、情報を捏造しないでください。有効な Markdown をコードフェンスなしで出力してください。`,
        input: buildNoteInput(
          getNoteInstruction(resultLocale, noteType),
          transcript,
          images,
        ),
      });

      return {
        transcript,
        ...(outputLanguage === "original" ? {} : { originalTranscript }),
        markdown: response.output_text.trim(),
      };
    },
  };
}
