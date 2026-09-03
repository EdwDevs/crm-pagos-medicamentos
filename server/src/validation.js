// Validacion pura de pagos: exportada para poder probarla por separado.
import { PRODUCTS, PAYMENT_STATUS, ensurePharmacy } from "./db.js";

export function validatePaymentPayload(db, body) {
  const errors = [];
  const pharmacyName = String(body.pharmacy ?? "").trim().replace(/\s+/g, " ");
  if (!pharmacyName) errors.push("La farmacia es obligatoria");

  const product = body.product;
  if (!PRODUCTS[product]) errors.push("Producto inválido");

  const quantity = Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0) errors.push("La cantidad debe ser un entero mayor a 0");

  const unitPrice = Number(body.unitPrice);
  if (!Number.isFinite(unitPrice) || unitPrice < 0) errors.push("El valor unitario debe ser 0 o mayor");

  const date = String(body.date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push("Fecha inválida (formato YYYY-MM-DD)");

  const status = body.status;
  if (!PAYMENT_STATUS.includes(status)) errors.push("Estado inválido");

  const referenceIds = Array.isArray(body.referenceIds) ? [...new Set(body.referenceIds.map(Number))] : [];
  if (referenceIds.some((id) => !Number.isInteger(id) || id <= 0)) errors.push("Referencias inválidas");
  if (status === "procesado" && referenceIds.length === 0) {
    errors.push("Para estado procesado debes seleccionar al menos una referencia");
  }

  if (errors.length) return { errors };

  const pharmacy = ensurePharmacy(db, pharmacyName);
  for (const refId of referenceIds) {
    const ref = db.prepare("SELECT pharmacy_id FROM payment_references WHERE id = ?").get(refId);
    if (!ref || ref.pharmacy_id !== pharmacy.id) {
      return { errors: [`La referencia ${refId} no pertenece a la farmacia indicada`] };
    }
  }

  return {
    errors: [],
    value: {
      pharmacyId: pharmacy.id,
      product,
      quantity,
      unitPrice,
      date,
      status,
      notes: String(body.notes ?? "").trim(),
      referenceIds,
    },
  };
}
