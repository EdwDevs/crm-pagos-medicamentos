import { Router } from "express";
import { PRODUCTS } from "../db.js";
import { validatePaymentPayload } from "../validation.js";

export function paymentsRouter(db) {
  const router = Router();

  const attachRefs = (payment) => {
    const refs = db
      .prepare(
        `SELECT pr.id, pr.reference, pr.value
         FROM payment_reference_links l
         JOIN payment_references pr ON pr.id = l.reference_id
         WHERE l.payment_id = ? ORDER BY pr.reference`
      )
      .all(payment.id);
    return { ...payment, references: refs };
  };

  // GET /api/payments?product=&status=&pharmacyId=&from=&to=&search=
  router.get("/", (req, res) => {
    const { product, status, pharmacyId, from, to, search } = req.query;
    const where = [];
    const params = {};
    if (product && PRODUCTS[product]) { where.push("p.product = @product"); params.product = product; }
    if (status && ["pendiente", "procesado"].includes(status)) { where.push("p.status = @status"); params.status = status; }
    if (pharmacyId) { where.push("p.pharmacy_id = @pharmacyId"); params.pharmacyId = Number(pharmacyId); }
    if (from) { where.push("p.date >= @from"); params.from = from; }
    if (to) { where.push("p.date <= @to"); params.to = to + "T23:59:59"; }
    if (search) { where.push("(ph.name LIKE @search OR p.notes LIKE @search)"); params.search = `%${search}%`; }

    const sql = `
      SELECT p.*, ph.name AS pharmacy
      FROM payments p JOIN pharmacies ph ON ph.id = p.pharmacy_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY p.date DESC, p.id DESC`;
    const rows = db.prepare(sql).all(params);
    res.json(rows.map(attachRefs));
  });

  router.get("/:id", (req, res) => {
    const row = db
      .prepare("SELECT p.*, ph.name AS pharmacy FROM payments p JOIN pharmacies ph ON ph.id = p.pharmacy_id WHERE p.id = ?")
      .get(req.params.id);
    if (!row) return res.status(404).json({ error: "Pago no encontrado" });
    res.json(attachRefs(row));
  });

  router.post("/", (req, res) => {
    const result = validatePaymentPayload(db, req.body);
    if (result.errors.length) return res.status(400).json({ errors: result.errors });

    const { pharmacyId, product, quantity, unitPrice, date, status, notes, referenceIds } = result.value;
    const total = quantity * unitPrice;
    const info = db
      .prepare(
        `INSERT INTO payments (pharmacy_id, product, quantity, unit_price, total_amount, date, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(pharmacyId, product, quantity, unitPrice, total, date, status, notes || "");
    const paymentId = Number(info.lastInsertRowid);
    const link = db.prepare("INSERT INTO payment_reference_links (payment_id, reference_id) VALUES (?, ?)");
    for (const refId of referenceIds) link.run(paymentId, refId);
    res.status(201).json({ id: paymentId, total_amount: total });
  });

  router.put("/:id", (req, res) => {
    const existing = db.prepare("SELECT * FROM payments WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Pago no encontrado" });

    const merged = {
      pharmacy: req.body.pharmacy ?? db.prepare("SELECT name FROM pharmacies WHERE id = ?").get(existing.pharmacy_id).name,
      product: req.body.product ?? existing.product,
      quantity: req.body.quantity ?? existing.quantity,
      unitPrice: req.body.unitPrice ?? existing.unit_price,
      date: req.body.date ?? existing.date.slice(0, 10),
      status: req.body.status ?? existing.status,
      notes: req.body.notes ?? existing.notes,
      referenceIds: req.body.referenceIds ?? db.prepare("SELECT reference_id FROM payment_reference_links WHERE payment_id = ?").all(existing.id).map((r) => r.reference_id),
    };
    const result = validatePaymentPayload(db, merged);
    if (result.errors.length) return res.status(400).json({ errors: result.errors });

    const { pharmacyId, product, quantity, unitPrice, date, status, notes, referenceIds } = result.value;
    db.prepare(
      `UPDATE payments SET pharmacy_id=?, product=?, quantity=?, unit_price=?, total_amount=?, date=?, status=?, notes=? WHERE id=?`
    ).run(pharmacyId, product, quantity, unitPrice, quantity * unitPrice, date, status, notes || "", existing.id);
    db.prepare("DELETE FROM payment_reference_links WHERE payment_id = ?").run(existing.id);
    const link = db.prepare("INSERT INTO payment_reference_links (payment_id, reference_id) VALUES (?, ?)");
    for (const refId of referenceIds) link.run(existing.id, refId);
    res.json({ ok: true });
  });

  router.patch("/:id/status", (req, res) => {
    const existing = db.prepare("SELECT * FROM payments WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Pago no encontrado" });
    const next = req.body.status;
    if (!["pendiente", "procesado"].includes(next)) {
      return res.status(400).json({ errors: ["Estado inválido"] });
    }
    db.prepare("UPDATE payments SET status = ? WHERE id = ?").run(next, existing.id);
    res.json({ ok: true, status: next });
  });

  router.delete("/:id", (req, res) => {
    const info = db.prepare("DELETE FROM payments WHERE id = ?").run(req.params.id);
    if (!info.changes) return res.status(404).json({ error: "Pago no encontrado" });
    res.json({ ok: true });
  });

  return router;
}
