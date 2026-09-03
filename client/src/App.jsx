import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";
import { Dashboard } from "./components/Dashboard.jsx";
import { PaymentsTable } from "./components/PaymentsTable.jsx";
import { PaymentForm } from "./components/PaymentForm.jsx";
import { ReferencesPanel } from "./components/ReferencesPanel.jsx";

export default function App() {
  const [view, setView] = useState("dashboard");
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([api.payments(), api.stats()]);
      setPayments(p);
      setStats(s);
      setError("");
    } catch (e) {
      setError("No se pudo conectar con el servidor: " + e.message);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const openNew = () => { setEditing(null); setShowForm(true); };
  const openEdit = (p) => { setEditing(p); setShowForm(true); };

  const onDelete = async (p) => {
    if (!window.confirm(`¿Eliminar el pago #${p.id} de ${p.pharmacy}?`)) return;
    await api.deletePayment(p.id);
    refresh();
  };

  const onToggleStatus = async (p) => {
    await api.setStatus(p.id, p.status === "procesado" ? "pendiente" : "procesado");
    refresh();
  };

  return (
    <div className="container-fluid py-4 px-4 app-shell">
      <header className="d-flex flex-wrap align-items-center gap-3 mb-4">
        <h1 className="h3 mb-0">💊 CRM Pagos Medicamentos</h1>
        <nav className="btn-group ms-auto">
          {[["dashboard", "📊 Dashboard"], ["pagos", "📋 Pagos"], ["referencias", "🔖 Referencias"]].map(([key, label]) => (
            <button key={key} className={`btn btn-sm ${view === key ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setView(key)}>
              {label}
            </button>
          ))}
        </nav>
        <button className="btn btn-success btn-sm" onClick={openNew}>＋ Nuevo pago</button>
      </header>

      {error && <div className="alert alert-danger">{error}</div>}

      {view === "dashboard" && <Dashboard stats={stats} />}
      {view === "pagos" && <PaymentsTable payments={payments} onEdit={openEdit} onDelete={onDelete} onToggleStatus={onToggleStatus} />}
      {view === "referencias" && <ReferencesPanel />}

      {showForm && (
        <PaymentForm
          payment={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); refresh(); }}
        />
      )}
    </div>
  );
}
