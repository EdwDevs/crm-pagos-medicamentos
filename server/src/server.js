import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { createDb } from "./db.js";

const PORT = process.env.PORT || 4000;
const dbPath = process.env.DB_PATH || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "crm.db");
const db = createDb(dbPath);

// Auto-seed: en hosts con disco efímero (p. ej. Render free) la BD inicia vacía;
// si SEED_FROM_FIREBASE=1 (o por defecto cuando esta vacia y FIREBASE no esta desactivado),
// reimporta los datos desde Firestore.
const isEmpty = db.prepare("SELECT COUNT(*) AS n FROM payments").get().n === 0;
if (isEmpty && process.env.SEED_FROM_FIREBASE !== "0") {
  const { migrate } = await import("../scripts/migrate-firebase.js");
  console.log("BD vacía: importando datos desde Firebase…");
  await migrate(dbPath).then((c) => console.log("Seed listo:", JSON.stringify(c)))
    .catch((e) => console.error("Seed falló (la API arranca vacía):", e.message));
}

const app = createApp(db);
app.listen(PORT, () => console.log(`API CRM Medicamentos en http://localhost:${PORT}`));
