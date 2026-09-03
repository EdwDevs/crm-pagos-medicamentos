import { useMemo, useState } from "react";
import { PRODUCTS, STATUS, fmtMoney, fmtDate } from "../api.js";

export function PaymentsTable({ payments, onEdit, onDelete, onToggleStatus }) {
  const [filters, setFilters] = useState({ product: "", status: "", search: "" });

  const filtered = useMemo(
    () =>
      payments.filter((p) => {
        if (filters.product && p.product !== filters.product) return false;
        if (filters.status && p.status !== filters.status) return false;
        if (filters.search) {
          const q = filters.search.toLowerCase();
          const hay = `${p.pharmacy} ${p.notes || ""} ${(p.references || []).map((r) => r.reference).join(" ")}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      }),
    [payments, filters]
  );

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="card">
      <div className="card-body">
        <div className="row g-2 mb-3">
          <div className="col-md-3">
            <input className="form-control form-control-sm" placeholder="🔍 Buscar farmacia, nota o referencia…" value={filters.search} onChange={set("search")} />
          </div>
          <div className="col-md-3">
            <select className="form-select form-select-sm" value={filters.product} onChange={set("product")}>
              <option value="">Todos los productos</option>
              {Object.entries(PRODUCTS).map(([k, p]) => <option key={k} value={k}>{p.icon} {p.name}</option>)}
            </select>
          </div>
          <div className="col-md-3">
            <select className="form-select form-select-sm" value={filters.status} onChange={set("status")}>
              <option value="">Todos los estados</option>
              {Object.entries(STATUS).map(([k, s]) => <option key={k} value={k}>{s.icon} {s.label}</option>)}
            </select>
          </div>
          <div className="col-md-3 text-md-end align-self-center">
            <span className="badge text-bg-light">{filtered.length} pagos · {fmtMoney(filtered.reduce((a, p) => a + p.total_amount, 0))}</span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Fecha</th><th>Farmacia</th><th>Producto</th><th className="text-end">Cant.</th>
                <th className="text-end">Unitario</th><th className="text-end">Total</th>
                <th>Estado</th><th>Referencias</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan="9" className="text-center text-muted py-4">No hay pagos con estos filtros</td></tr>
              )}
              {filtered.map((p) => {
                const prod = PRODUCTS[p.product] || {};
                const st = STATUS[p.status] || {};
                return (
                  <tr key={p.id}>
                    <td>{fmtDate(p.date)}</td>
                    <td>{p.pharmacy}</td>
                    <td><span className={`badge ${prod.cls}`}>{prod.icon} {prod.short}</span></td>
                    <td className="text-end">{p.quantity}</td>
                    <td className="text-end">{fmtMoney(p.unit_price)}</td>
                    <td className="text-end fw-semibold">{fmtMoney(p.total_amount)}</td>
                    <td>
                      <button className={`badge border-0 ${st.cls}`} title="Cambiar estado" onClick={() => onToggleStatus(p)}>
                        {st.icon} {st.label}
                      </button>
                    </td>
                    <td className="small">{(p.references || []).map((r) => r.reference).join(", ") || "—"}</td>
                    <td className="text-end text-nowrap">
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => onEdit(p)}>✏️</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(p)}>🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
