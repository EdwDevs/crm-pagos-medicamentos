// Migracion unica: Firestore (CRM_Medicamentos-duplicate) -> SQLite del nuevo CRM.
// Uso: node scripts/migrate-firebase.js [--db ruta/a/crm.db]
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { createDb, ensurePharmacy } from "../src/db.js";

const firebaseConfig = {
  apiKey: "AIzaSyAaVSb70OFIoX48T9GbLmTcdXOSvKv2pRk",
  authDomain: "zona1561-4de30.firebaseapp.com",
  projectId: "zona1561-4de30",
};

const normalizeProduct = (value) => {
  const lower = String(value || "").toLowerCase();
  if (lower.includes("800")) return "multidol800";
  if (lower.includes("400") || lower.includes("multidol")) return "multidol400";
  return "descongel";
};

const parseDate = (value) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (value.toDate) return value.toDate().toISOString().slice(0, 10);
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
};

export async function migrate(dbPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "crm.db")) {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  await signInAnonymously(auth);
  console.log("✓ Autenticado en Firebase (anónimo)");

  const db = getFirestore(app);
  const [pagosSnap, refsSnap] = await Promise.all([
    getDocs(collection(db, "pagos_productos")),
    getDocs(collection(db, "payment_references")),
  ]);
  console.log(`✓ Leídos de Firestore: ${pagosSnap.size} pagos, ${refsSnap.size} referencias`);

  const sqlite = createDb(dbPath);
  sqlite.exec("DELETE FROM payment_reference_links; DELETE FROM payments; DELETE FROM payment_references; DELETE FROM pharmacies;");

  // 1. Referencias: (farmacia, reference) -> id local
  const refIndex = new Map();
  const key = (ph, ref) => `${ph.toLowerCase().trim()}||${ref.toLowerCase().trim()}`;
  const insertRef = sqlite.prepare("INSERT INTO payment_references (pharmacy_id, reference, value, active) VALUES (?, ?, ?, ?)");
  for (const doc of refsSnap.docs) {
    const d = doc.data();
    const pharmacy = ensurePharmacy(sqlite, d.pharmacy);
    if (!pharmacy || !d.reference) continue;
    const ref = String(d.reference).trim();
    if (refIndex.has(key(pharmacy.name, ref))) continue;
    const info = insertRef.run(pharmacy.id, ref, 0, d.active === false ? 0 : 1);
    refIndex.set(key(pharmacy.name, ref), Number(info.lastInsertRowid));
  }
  // La colección payment_references puede estar vacía: reconstruir referencias
  // a partir de los textos guardados en cada pago (paymentReferences).
  for (const doc of pagosSnap.docs) {
    const d = doc.data();
    const pharmacy = ensurePharmacy(sqlite, d.cliente || d.pharmacy || "Farmacia General");
    for (const refText of d.paymentReferences || []) {
      const ref = String(refText).trim();
      if (!ref || refIndex.has(key(pharmacy.name, ref))) continue;
      const info = insertRef.run(pharmacy.id, ref, 0, 1);
      refIndex.set(key(pharmacy.name, ref), Number(info.lastInsertRowid));
    }
  }

  // 2. Pagos
  const insertPay = sqlite.prepare(
    `INSERT INTO payments (pharmacy_id, product, quantity, unit_price, total_amount, date, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertLink = sqlite.prepare("INSERT OR IGNORE INTO payment_reference_links (payment_id, reference_id) VALUES (?, ?)");
  let ok = 0, skipped = 0;
  for (const doc of pagosSnap.docs) {
    const d = doc.data();
    const pharmacy = ensurePharmacy(sqlite, d.cliente || d.pharmacy || "Farmacia General");
    const product = normalizeProduct(d.producto || d.product);
    const quantity = Number(d.cajasPagadas ?? d.quantity ?? 1);
    const unitPrice = Number(d.valorUnitario ?? d.unitPrice ?? 0);
    const total = Number(d.totalPago ?? d.totalAmount ?? quantity * unitPrice) || quantity * unitPrice;
    const status = d.status === "pendiente" ? "pendiente" : "procesado";
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      skipped++;
      continue;
    }
    const info = insertPay.run(pharmacy.id, product, quantity, unitPrice, total, parseDate(d.fecha || d.date), status, d.observaciones || d.notes || "");
    const paymentId = Number(info.lastInsertRowid);
    // Vincular referencias por su texto (Firestore guarda el texto, no el id)
    for (const refText of d.paymentReferences || []) {
      const localId = refIndex.get(key(pharmacy.name, String(refText)));
      if (localId) insertLink.run(paymentId, localId);
    }
    ok++;
  }

  const counts = {
    farmacias: sqlite.prepare("SELECT COUNT(*) n FROM pharmacies").get().n,
    referencias: sqlite.prepare("SELECT COUNT(*) n FROM payment_references").get().n,
    pagos: sqlite.prepare("SELECT COUNT(*) n FROM payments").get().n,
  };
  console.log(`✓ Migración completa: ${counts.farmacias} farmacias, ${counts.referencias} referencias, ${counts.pagos} pagos (${ok} importados, ${skipped} omitidos)`);
  return counts;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const dbArg = process.argv.includes("--db") ? process.argv[process.argv.indexOf("--db") + 1] : undefined;
  migrate(dbArg).then(() => process.exit(0)).catch((e) => { console.error("✗ Error en la migración:", e.message); process.exit(1); });
}
