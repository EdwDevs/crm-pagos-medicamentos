import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { createDb } from "./db.js";

const PORT = process.env.PORT || 4000;
const dbPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "crm.db");
const app = createApp(createDb(dbPath));
app.listen(PORT, () => console.log(`API CRM Medicamentos en http://localhost:${PORT}`));
