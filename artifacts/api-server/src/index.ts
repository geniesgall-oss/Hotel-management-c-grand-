import app from "./app";
import { purgeOldHistory } from "./db.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Purge history records older than 2 months on startup, then every 24 hours
  purgeOldHistory();
  setInterval(purgeOldHistory, 24 * 60 * 60 * 1000);
});
