import { Router } from "express";
import { ensurePharmacy } from "../db.js";

export function pharmaciesRouter(db) {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json(db.prepare("SELECT * FROM pharmacies ORDER BY name").all());
  });

  router.post("/", (req, res) => {
    const pharmacy = ensurePharmacy(db, req.body.name);
    if (!pharmacy) return res.status(400).json({ errors: ["El nombre es obligatorio"] });
    res.status(201).json(pharmacy);
  });

  return router;
}

export function referencesRouter(db) {
  const router = Router();

  // GET /api/references?pharmacyId= -> referencias de esa farmacia
  router.get("/", (req, res) => {
    const { pharmacyId } = req.query;
    if (pharmacyId) {
      return res.json(
        db.prepare("SELECT * FROM payment_references WHERE pharmacy_id = ? ORDER BY reference").all(Number(pharmacyId))
      );
    }
    res.json(
      db.prepare(
        `SELECT pr.*, ph.name AS pharmacy FROM payment_references pr
         JOIN pharmacies ph ON ph.id = pr.pharmacy_id ORDER BY ph.name, pr.reference`
      ).all()
    );
  });

  router.post("/", (req, res) => {
    const reference = String(req.body.reference ?? "").trim();
    const value = Number(req.body.value ?? 0);
    const pharmacy = ensurePharmacy(db, req.body.pharmacy);
    if (!pharmacy) return res.status(400).json({ errors: ["La farmacia es obligatoria"] });
    if (!reference) return res.status(400).json({ errors: ["La referencia no puede estar vacía"] });
    if (!Number.isFinite(value) || value < 0) return res.status(400).json({ errors: ["El valor debe ser 0 o mayor"] });

    const dup = db
      .prepare("SELECT id FROM payment_references WHERE pharmacy_id = ? AND reference = ? COLLATE NOCASE")
      .get(pharmacy.id, reference);
    if (dup) return res.status(409).json({ errors: ["Esa referencia ya existe para esta farmacia"] });

    const info = db
      .prepare("INSERT INTO payment_references (pharmacy_id, reference, value) VALUES (?, ?, ?)")
      .run(pharmacy.id, reference, value);
    res.status(201).json({ id: Number(info.lastInsertRowid), pharmacy_id: pharmacy.id, reference, value, active: 1 });
  });

  router.patch("/:id", (req, res) => {
    const ref = db.prepare("SELECT * FROM payment_references WHERE id = ?").get(req.params.id);
    if (!ref) return res.status(404).json({ error: "Referencia no encontrada" });
    const active = req.body.active === undefined ? ref.active : (req.body.active ? 1 : 0);
    const value = req.body.value === undefined ? ref.value : Number(req.body.value);
    if (!Number.isFinite(value) || value < 0) return res.status(400).json({ errors: ["El valor debe ser 0 o mayor"] });
    db.prepare("UPDATE payment_references SET active = ?, value = ? WHERE id = ?").run(active, value, ref.id);
    res.json({ ok: true });
  });

  router.delete("/:id", (req, res) => {
    const used = db.prepare("SELECT COUNT(*) AS n FROM payment_reference_links WHERE reference_id = ?").get(req.params.id).n;
    if (used > 0) return res.status(409).json({ errors: ["La referencia está en uso por pagos; desactívala en su lugar"] });
    const info = db.prepare("DELETE FROM payment_references WHERE id = ?").run(req.params.id);
    if (!info.changes) return res.status(404).json({ error: "Referencia no encontrada" });
    res.json({ ok: true });
  });

  return router;
}
