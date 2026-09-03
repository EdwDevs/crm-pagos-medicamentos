export const PRODUCTS = {
  descongel: { name: "Descongel x100", short: "Descongel", icon: "❄️", cls: "text-bg-info" },
  multidol400: { name: "Multidol 400mg", short: "Multidol 400", icon: "💊", cls: "text-bg-success" },
  multidol800: { name: "Multidol 800mg", short: "Multidol 800", icon: "💊", cls: "text-bg-secondary" },
};

export const STATUS = {
  pendiente: { label: "Pendiente", icon: "⏳", cls: "text-bg-warning" },
  procesado: { label: "Procesado", icon: "✅", cls: "text-bg-success" },
};

export const fmtMoney = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n || 0));

export const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
};

const BASE = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.errors?.join(" ") || data.error || `Error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  products: () => request("/products"),
  payments: (filters = {}) => {
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
    return request("/payments" + (qs ? `?${qs}` : ""));
  },
  payment: (id) => request(`/payments/${id}`),
  createPayment: (payload) => request("/payments", { method: "POST", body: payload }),
  updatePayment: (id, payload) => request(`/payments/${id}`, { method: "PUT", body: payload }),
  setStatus: (id, status) => request(`/payments/${id}/status`, { method: "PATCH", body: { status } }),
  deletePayment: (id) => request(`/payments/${id}`, { method: "DELETE" }),
  pharmacies: () => request("/pharmacies"),
  references: (pharmacyId) => request("/references" + (pharmacyId ? `?pharmacyId=${pharmacyId}` : "")),
  createReference: (payload) => request("/references", { method: "POST", body: payload }),
  updateReference: (id, payload) => request(`/references/${id}`, { method: "PATCH", body: payload }),
  stats: () => request("/stats"),
};
