// Base de datos SQLite usando el modulo nativo node:sqlite (Node >= 22).
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

export const PRODUCTS = {
  descongel: { name: "Descongel x100", short: "Descongel", icon: "❄️", color: "#0284c7" },
  multidol400: { name: "Multidol 400mg", short: "Multidol 400", icon: "💊", color: "#059669" },
  multidol800: { name: "Multidol 800mg", short: "Multidol 800", icon: "💊", color: "#7c3aed" },
};

export const PAYMENT_STATUS = ["pendiente", "procesado"];

export function createDb(dbPath = path.join(process.cwd(), "data", "crm.db")) {
  if (dbPath !== ":memory:") fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS pharmacies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payment_references (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pharmacy_id INTEGER NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
      reference TEXT NOT NULL,
      value REAL NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (pharmacy_id, reference COLLATE NOCASE)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pharmacy_id INTEGER NOT NULL REFERENCES pharmacies(id),
      product TEXT NOT NULL CHECK (product IN ('descongel','multidol400','multidol800')),
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price REAL NOT NULL CHECK (unit_price >= 0),
      total_amount REAL NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','procesado')),
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payment_reference_links (
      payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      reference_id INTEGER NOT NULL REFERENCES payment_references(id),
      PRIMARY KEY (payment_id, reference_id)
    );

    CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
    CREATE INDEX IF NOT EXISTS idx_payments_pharmacy ON payments(pharmacy_id);
    CREATE INDEX IF NOT EXISTS idx_references_pharmacy ON payment_references(pharmacy_id);
  `);
  return db;
}

export function ensurePharmacy(db, name) {
  const trimmed = String(name || "").trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  db.prepare("INSERT OR IGNORE INTO pharmacies (name) VALUES (?)").run(trimmed);
  return db.prepare("SELECT * FROM pharmacies WHERE name = ? COLLATE NOCASE").get(trimmed);
}
