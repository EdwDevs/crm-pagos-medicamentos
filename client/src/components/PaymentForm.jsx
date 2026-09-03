import { useEffect, useState } from "react";
import { api, PRODUCTS, STATUS, fmtMoney } from "../api.js";

export function PaymentForm({ payment, onClose, onSaved }) {
  const editing = Boolean(payment);
  const [form, setForm] = useState({
    pharmacy: payment?.pharmacy || "",
    product: payment?.product || "descongel",
    quantity: payment?.quantity || 1,
    unitPrice: payment?.unit_price ?? 0,
    date: payment?.date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    status: payment?.status || "pendiente",
    notes: payment?.notes || "",
  });
  const [refs, setRefs] = useState([]);
  const [selected, setSelected] = useState(new Set((payment?.references || []).map((r) => r.id)));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Cargar referencias al elegir farmacia
  useEffect(() => {
    const load = async () => {
      const list = await api.pharmacies();
      const match = list.find((p) => p.name.toLowerCase() === form.pharmacy.trim().toLowerCase());
      setRefs(match ? await api.references(match.id) : []);
    };
    load().catch(() => setRefs([]));
  }, [form.pharmacy]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const total = Number(form.quantity || 0) * Number(form.unitPrice || 0);

  const toggleRef = (id) =>
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = { ...form, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice), referenceIds: [...selected] };
    try {
      if (editing) await api.updatePayment(payment.id, payload);
      else await api.createPayment(payload);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop-custom" onClick={onClose}>
      <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="card-header d-flex justify-content-between align-items-center">
          <strong>{editing ? `Editar pago #${payment.id}` : "Nuevo pago"}</strong>
          <button className="btn-close" onClick={onClose} aria-label="Cerrar" />
        </div>
        <form onSubmit={submit}>
          <div className="card-body">
            {error && <div className="alert alert-danger py-2">{error}</div>}
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Farmacia *</label>
                <input className="form-control" value={form.pharmacy} onChange={set("pharmacy")} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Producto *</label>
                <select className="form-select" value={form.product} onChange={set("product")}>
                  {Object.entries(PRODUCTS).map(([k, p]) => <option key={k} value={k}>{p.icon} {p.name}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Cantidad *</label>
                <input type="number" min="1" step="1" className="form-control" value={form.quantity} onChange={set("quantity")} required />
              </div>
              <div className="col-md-4">
                <label className="form-label">Valor unitario *</label>
                <input type="number" min="0" step="100" className="form-control" value={form.unitPrice} onChange={set("unitPrice")} required />
              </div>
              <div className="col-md-4">
                <label className="form-label">Fecha *</label>
                <input type="date" className="form-control" value={form.date} onChange={set("date")} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Estado</label>
                <select className="form-select" value={form.status} onChange={set("status")}>
                  {Object.entries(STATUS).map(([k, s]) => <option key={k} value={k}>{s.icon} {s.label}</option>)}
                </select>
              </div>
              <div className="col-md-6 d-flex align-items-end justify-content-end">
                <div className="fs-5 fw-bold">Total: {fmtMoney(total)}</div>
              </div>
              <div className="col-12">
                <label className="form-label">Referencias de pago {form.status === "procesado" && <span className="text-danger">*</span>}</label>
                {refs.length === 0 && (
                  <p className="text-muted small mb-0">
                    Sin referencias para esta farmacia. Créalas en la pestaña “Referencias”.
                  </p>
                )}
                <div className="d-flex flex-wrap gap-2">
                  {refs.map((r) => (
                    <label key={r.id} className={`btn btn-sm ${selected.has(r.id) ? "btn-primary" : "btn-outline-secondary"} ${!r.active ? "opacity-50" : ""}`}>
                      <input type="checkbox" className="d-none" checked={selected.has(r.id)} onChange={() => toggleRef(r.id)} />
                      {r.reference} · {fmtMoney(r.value)}
                    </label>
                  ))}
                </div>
              </div>
              <div className="col-12">
                <label className="form-label">Notas</label>
                <textarea className="form-control" rows="2" value={form.notes} onChange={set("notes")} />
              </div>
            </div>
          </div>
          <div className="card-footer d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Registrar pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
