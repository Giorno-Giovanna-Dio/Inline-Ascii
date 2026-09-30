const form = document.querySelector("#notes-form");
const audio = document.querySelector("#audio");
const upload = document.querySelector(".upload");
const fileLabel = document.querySelector("#file-label");
const submit = document.querySelector("#submit");
const status = document.querySelector("#status");
const result = document.querySelector("#result");
const markdown = document.querySelector("#markdown");
const transcript = document.querySelector("#transcript");
const copy = document.querySelector("#copy");
const localeInput = document.querySelector("#locale");
const outputLanguage = document.querySelector("#output-language");

const translations = {
  "zh-Hant": {
    title: "Audio Notes｜音檔轉 Markdown 筆記",
    heroTitle: "把聲音，整理成<br><em>可行動的筆記。</em>",
    description: "上傳音檔、選擇格式，幾分鐘內取得逐字稿與 Markdown 筆記。",
    chooseFile: "選擇或拖放音檔",
    fileHelp: "MP3、MP4、M4A、WAV、WebM、OGG、FLAC · 最多 25 MB",
    languageLabel: "文字與筆記的輸出語言",
    languageHelp: "選擇日文時，中文語音也會翻譯成日文逐字稿。",
    outputChinese: "繁體中文",
    outputJapanese: "日本語",
    outputOriginal: "保留音檔原語言",
    typeLegend: "想要哪一種筆記？",
    meeting: "會議紀錄",
    lecture: "課堂筆記",
    interview: "訪談摘要",
    summary: "精簡重點",
    submit: "產生筆記",
    processing: "正在轉錄並整理筆記，請稍候…",
    completed: "筆記完成",
    failed: "產生失敗",
    resultTitle: "Markdown 筆記",
    copy: "複製",
    copied: "已複製",
    transcript: "查看逐字稿",
  },
  ja: {
    title: "Audio Notes｜音声から Markdown ノートへ",
    heroTitle: "音声を、<br><em>行動につながるノートへ。</em>",
    description: "音声ファイルと形式を選ぶだけ。文字起こしと Markdown ノートを数分で作成します。",
    chooseFile: "音声ファイルを選択またはドロップ",
    fileHelp: "MP3、MP4、M4A、WAV、WebM、OGG、FLAC · 最大 25 MB",
    languageLabel: "文字起こしとノートの出力言語",
    languageHelp: "日本語を選ぶと、中国語の音声も日本語の文字起こしに翻訳されます。",
    outputChinese: "繁体字中国語",
    outputJapanese: "日本語",
    outputOriginal: "音声の元の言語を保持",
    typeLegend: "ノートの種類を選んでください",
    meeting: "議事録",
    lecture: "講義ノート",
    interview: "インタビュー",
    summary: "要点まとめ",
    submit: "ノートを作成",
    processing: "文字起こしとノート作成を行っています…",
    completed: "ノートが完成しました",
    failed: "作成に失敗しました",
    resultTitle: "Markdown ノート",
    copy: "コピー",
    copied: "コピーしました",
    transcript: "文字起こしを見る",
  },
};

let currentLocale = "zh-Hant";
let outputLanguageTouched = false;

function applyLocale(locale) {
  currentLocale = locale === "ja" ? "ja" : "zh-Hant";
  const text = translations[currentLocale];
  document.documentElement.lang = currentLocale;
  document.title = text.title;
  localeInput.value = currentLocale;
  document.querySelector("#hero-title").innerHTML = text.heroTitle;
  document.querySelector("#hero-description").textContent = text.description;
  document.querySelector("#file-help").textContent = text.fileHelp;
  document.querySelector("#language-label").textContent = text.languageLabel;
  document.querySelector("#language-help").textContent = text.languageHelp;
  outputLanguage.querySelector('[value="zh-Hant"]').textContent = text.outputChinese;
  outputLanguage.querySelector('[value="ja"]').textContent = text.outputJapanese;
  outputLanguage.querySelector('[value="original"]').textContent = text.outputOriginal;
  document.querySelector("#type-legend").textContent = text.typeLegend;
  document.querySelector("#type-meeting").textContent = text.meeting;
  document.querySelector("#type-lecture").textContent = text.lecture;
  document.querySelector("#type-interview").textContent = text.interview;
  document.querySelector("#type-summary").textContent = text.summary;
  document.querySelector("#submit-label").textContent = text.submit;
  document.querySelector("#result-title").textContent = text.resultTitle;
  document.querySelector("#transcript-label").textContent = text.transcript;
  markdown.setAttribute("aria-label", text.resultTitle);
  copy.textContent = text.copy;
  if (!outputLanguageTouched) outputLanguage.value = currentLocale;
  if (!audio.files[0]) fileLabel.textContent = text.chooseFile;
  document.querySelectorAll(".language").forEach((button) => {
    const active = button.dataset.locale === currentLocale;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  localStorage.setItem("audio-notes-locale", currentLocale);
}

function showFile(file) {
  if (file) fileLabel.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`;
}

document.querySelectorAll(".language").forEach((button) => {
  button.addEventListener("click", () => applyLocale(button.dataset.locale));
});
outputLanguage.addEventListener("change", () => {
  outputLanguageTouched = true;
});

const savedLocale = localStorage.getItem("audio-notes-locale");
applyLocale(savedLocale || (navigator.language.startsWith("ja") ? "ja" : "zh-Hant"));

audio.addEventListener("change", () => showFile(audio.files[0]));
["dragenter", "dragover"].forEach((event) =>
  upload.addEventListener(event, () => upload.classList.add("dragging")),
);
["dragleave", "drop"].forEach((event) =>
  upload.addEventListener(event, () => upload.classList.remove("dragging")),
);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = translations[currentLocale];
  status.className = "status";
  status.textContent = text.processing;
  submit.disabled = true;

  try {
    const response = await fetch(`/api/notes?lang=${currentLocale}`, {
      method: "POST",
      body: new FormData(form),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || text.failed);

    markdown.value = data.markdown;
    transcript.textContent = data.transcript;
    result.classList.remove("hidden");
    status.textContent = text.completed;
    result.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    status.className = "status error";
    status.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
});

copy.addEventListener("click", async () => {
  await navigator.clipboard.writeText(markdown.value);
  copy.textContent = translations[currentLocale].copied;
  setTimeout(() => (copy.textContent = translations[currentLocale].copy), 1500);
});
