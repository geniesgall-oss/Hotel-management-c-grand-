import app from "./app";
import { purgeOldHistory } from "./db.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);

  // Purge history records older than 2 months on startup, then every 24 hours
  purgeOldHistory();
  setInterval(purgeOldHistory, 24 * 60 * 60 * 1000);
});
