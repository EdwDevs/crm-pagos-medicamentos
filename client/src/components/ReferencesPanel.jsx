import { useEffect, useState } from "react";
import { api, fmtMoney } from "../api.js";

export function ReferencesPanel() {
  const [refs, setRefs] = useState([]);
  const [form, setForm] = useState({ pharmacy: "", reference: "", value: "" });
  const [error, setError] = useState("");

  const load = async () => setRefs(await api.references());
  useEffect(() => { load().catch(() => {}); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.createReference({ pharmacy: form.pharmacy, reference: form.reference, value: Number(form.value || 0) });
      setForm({ pharmacy: "", reference: "", value: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggle = async (r) => { await api.updateReference(r.id, { active: !r.active }); load(); };

  return (
    <div className="card">
      <div className="card-body">
        <h2 className="h5">Referencias de pago por farmacia</h2>
        <form className="row g-2 my-3" onSubmit={submit}>
          <div className="col-md-4">
            <input className="form-control" placeholder="Farmacia" value={form.pharmacy} onChange={(e) => setForm({ ...form, pharmacy: e.target.value })} required />
          </div>
          <div className="col-md-3">
            <input className="form-control" placeholder="Referencia (ej. REF-001)" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} required />
          </div>
          <div className="col-md-3">
            <input className="form-control" type="number" min="0" step="100" placeholder="Valor" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required />
          </div>
          <div className="col-md-2">
            <button className="btn btn-primary w-100">Agregar</button>
          </div>
        </form>
        {error && <div className="alert alert-danger py-2">{error}</div>}

        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead><tr><th>Farmacia</th><th>Referencia</th><th className="text-end">Valor</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {refs.length === 0 && <tr><td colSpan="5" className="text-center text-muted py-4">Sin referencias aún</td></tr>}
              {refs.map((r) => (
                <tr key={r.id} className={r.active ? "" : "text-muted"}>
                  <td>{r.pharmacy}</td>
                  <td>{r.reference}</td>
                  <td className="text-end">{fmtMoney(r.value)}</td>
                  <td><span className={`badge ${r.active ? "text-bg-success" : "text-bg-secondary"}`}>{r.active ? "Activa" : "Inactiva"}</span></td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => toggle(r)}>
                      {r.active ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
