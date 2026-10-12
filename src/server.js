import "dotenv/config";
import { createApp } from "./app.js";
import { createNoteService } from "./note-service.js";

const port = Number(process.env.PORT) || 3000;

try {
  const app = createApp(createNoteService());
  app.listen(port, () => {
    console.log(`Audio Notes 已啟動：http://localhost:${port}`);
  });
} catch (error) {
  console.error(`啟動失敗：${error.message}`);
  process.exit(1);
}
