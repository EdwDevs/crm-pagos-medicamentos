import { Router } from "express";

// GET /api/stats -> totales por producto, estado y top farmacias
export function statsRouter(db) {
  const router = Router();

  router.get("/", (_req, res) => {
    const byProduct = db
      .prepare("SELECT product, SUM(quantity) AS quantity, SUM(total_amount) AS total FROM payments GROUP BY product")
      .all();
    const byStatus = db
      .prepare("SELECT status, COUNT(*) AS count, SUM(total_amount) AS total FROM payments GROUP BY status")
      .all();
    const byPharmacy = db
      .prepare(
        `SELECT ph.name AS pharmacy, COUNT(*) AS count, SUM(p.total_amount) AS total
         FROM payments p JOIN pharmacies ph ON ph.id = p.pharmacy_id
         GROUP BY ph.name ORDER BY total DESC LIMIT 10`
      )
      .all();
    const monthly = db
      .prepare(
        `SELECT substr(date, 1, 7) AS month, SUM(total_amount) AS total, COUNT(*) AS count
         FROM payments GROUP BY month ORDER BY month`
      )
      .all();
    const totals = db
      .prepare("SELECT COUNT(*) AS count, IFNULL(SUM(total_amount), 0) AS total FROM payments")
      .get();
    res.json({ byProduct, byStatus, byPharmacy, monthly, totals });
  });

  return router;
}
