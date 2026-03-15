import app from "./app";
import { initDb, purgeOldHistory } from "./db.js";

const PORT = process.env.PORT || 3000;

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      purgeOldHistory();
      setInterval(purgeOldHistory, 24 * 60 * 60 * 1000);
    });
  })
  .catch((err) => {
    console.error("[startup] Failed to initialise database:", err);
    process.exit(1);
  });
