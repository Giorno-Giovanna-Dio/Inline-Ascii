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

function showFile(file) {
  if (file) fileLabel.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`;
}

audio.addEventListener("change", () => showFile(audio.files[0]));
["dragenter", "dragover"].forEach((event) =>
  upload.addEventListener(event, () => upload.classList.add("dragging")),
);
["dragleave", "drop"].forEach((event) =>
  upload.addEventListener(event, () => upload.classList.remove("dragging")),
);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  status.className = "status";
  status.textContent = "正在轉錄並整理筆記，請稍候…";
  submit.disabled = true;

  try {
    const response = await fetch("/api/notes", {
      method: "POST",
      body: new FormData(form),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "產生失敗");

    markdown.value = data.markdown;
    transcript.textContent = data.transcript;
    result.classList.remove("hidden");
    status.textContent = "筆記完成";
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
  copy.textContent = "已複製";
  setTimeout(() => (copy.textContent = "複製"), 1500);
});
