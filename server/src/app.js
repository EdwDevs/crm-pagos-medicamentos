import express from "express";
import cors from "cors";
import { createDb, PRODUCTS } from "./db.js";
import { paymentsRouter } from "./routes/payments.js";
import { pharmaciesRouter, referencesRouter } from "./routes/references.js";
import { statsRouter } from "./routes/stats.js";

export function createApp(db = createDb()) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/products", (_req, res) => res.json(PRODUCTS));
  app.use("/api/payments", paymentsRouter(db));
  app.use("/api/pharmacies", pharmaciesRouter(db));
  app.use("/api/references", referencesRouter(db));
  app.use("/api/stats", statsRouter(db));

  app.use((_req, res) => res.status(404).json({ error: "Ruta no encontrada" }));
  return app;
}
