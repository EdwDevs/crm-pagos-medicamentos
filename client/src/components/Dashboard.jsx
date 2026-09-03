import { PRODUCTS, STATUS, fmtMoney } from "../api.js";

export function Dashboard({ stats }) {
  if (!stats) return <p className="text-muted">Cargando estadísticas…</p>;

  const byProduct = Object.fromEntries((stats.byProduct || []).map((r) => [r.product, r]));
  const byStatus = Object.fromEntries((stats.byStatus || []).map((r) => [r.status, r]));
  const maxMonthly = Math.max(1, ...(stats.monthly || []).map((m) => m.total));

  return (
    <div>
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card stat-card">
            <div className="card-body">
              <div className="stat-value">{fmtMoney(stats.totals.total)}</div>
              <div className="text-muted small">Total recaudado ({stats.totals.count} pagos)</div>
            </div>
          </div>
        </div>
        {Object.entries(PRODUCTS).map(([key, p]) => (
          <div className="col-md-3" key={key}>
            <div className="card stat-card">
              <div className="card-body">
                <div className="stat-value">{p.icon} {byProduct[key]?.quantity || 0}</div>
                <div className="text-muted small">{p.name} — {fmtMoney(byProduct[key]?.total || 0)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-md-4">
          <div className="card h-100"><div className="card-body">
            <h2 className="h6 text-uppercase text-muted">Por estado</h2>
            {Object.entries(STATUS).map(([key, s]) => (
              <div key={key} className="d-flex justify-content-between border-bottom py-2">
                <span><span className={`badge ${s.cls} me-2`}>{s.icon} {s.label}</span></span>
                <span>{byStatus[key]?.count || 0} pagos · {fmtMoney(byStatus[key]?.total || 0)}</span>
              </div>
            ))}
          </div></div>
        </div>
        <div className="col-md-4">
          <div className="card h-100"><div className="card-body">
            <h2 className="h6 text-uppercase text-muted">Top farmacias</h2>
            {(stats.byPharmacy || []).length === 0 && <p className="text-muted small">Sin datos aún.</p>}
            {(stats.byPharmacy || []).map((f) => (
              <div key={f.pharmacy} className="d-flex justify-content-between border-bottom py-2">
                <span>{f.pharmacy}</span><span>{fmtMoney(f.total)}</span>
              </div>
            ))}
          </div></div>
        </div>
        <div className="col-md-4">
          <div className="card h-100"><div className="card-body">
            <h2 className="h6 text-uppercase text-muted">Pagos por mes</h2>
            {(stats.monthly || []).map((m) => (
              <div key={m.month} className="mb-2">
                <div className="d-flex justify-content-between small">
                  <span>{m.month}</span><span>{fmtMoney(m.total)}</span>
                </div>
                <div className="progress" style={{ height: 8 }}>
                  <div className="progress-bar" style={{ width: `${(m.total / maxMonthly) * 100}%` }} />
                </div>
              </div>
            ))}
          </div></div>
        </div>
      </div>
    </div>
  );
}
