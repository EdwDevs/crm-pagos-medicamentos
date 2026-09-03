// Ingresa pagos pendientes a Firebase (fuente de verdad) y al API en Render.
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

const API = "https://crm-pagos-medicamentos-api.onrender.com/api";

const firebaseConfig = {
  apiKey: "AIzaSyAaVSb70OFIoX48T9GbLmTcdXOSvKv2pRk",
  authDomain: "zona1561-4de30.firebaseapp.com",
  projectId: "zona1561-4de30",
};

const P = { descongel: { fs: "DESCONGEL", price: 5000 }, multidol400: { fs: "MULTIDOL X400", price: 4000 }, multidol800: { fs: "MULTIDOL X800", price: 5000 } };

/** [fecha, farmacia, producto, cantidad, extra] */
const rows = [
  ["2026-08-27", "FARMACIA ECOMED", "multidol400", 3, ""],
  ["2026-08-27", "FARMACIA ECOMED", "multidol800", 3, ""],
  ["2026-08-27", "DROGUERIA GLOBALFARMA LA CUMBRE", "descongel", 6, ""],
  ["2026-08-26", "DROGUERIA LA 16 DE SAN CARLOS", "descongel", 1, ""],
  ["2026-08-26", "DROGUERIA SALUD Y BELLEZA SALBED", "descongel", 1, ""],
  ["2026-08-26", "DROGUERIA PASEO GALICIA", "descongel", 2, ""],
  ["2026-08-26", "DROGUERIA SALBED", "descongel", 2, ""],
  ["2026-08-26", "FARMACIA FARMAMESA LOS SANTOS", "descongel", 1, ""],
  ["2026-08-26", "FARMACIA FARMAMESA LOS SANTOS", "multidol400", 1, ""],
  ["2026-08-26", "FARMACIA FARMAMESA LOS SANTOS", "multidol800", 1, ""],
  ["2026-08-24", "REBUSQUE OCAÑERO", "descongel", 90, "Enviado"],
  ["2026-08-24", "SERVIC D", "multidol400", 11, "Enviado"],
  ["2026-08-24", "REBUSQUE OCAÑERO", "descongel", 68, "Enviado"],
];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
await signInAnonymously(auth);
const fs = getFirestore(app);

let okFs = 0, okApi = 0, failed = [];
for (const [fecha, farmacia, prod, qty, extra] of rows) {
  const unitPrice = P[prod].price;
  const total = unitPrice * qty;

  // 1. Firestore (formato heredado de la app anterior)
  try {
    await addDoc(collection(fs, "pagos_productos"), {
      cliente: farmacia,
      producto: P[prod].fs,
      cajasPagadas: qty,
      valorUnitario: unitPrice,
      totalPago: total,
      fecha,
      status: "pendiente",
      observaciones: extra,
      paymentReferences: [],
      fechaRegistro: new Date().toISOString(),
    });
    okFs++;
  } catch (e) {
    failed.push(`${farmacia}/${prod}: Firebase ${e.message}`);
  }

  // 2. API Render
  try {
    const res = await fetch(`${API}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pharmacy: farmacia, product: prod, quantity: qty, unitPrice, date: fecha, status: "pendiente", notes: extra }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    okApi++;
  } catch (e) {
    failed.push(`${farmacia}/${prod}: API ${e.message}`);
  }
}

console.log(`Firestore: ${okFs}/${rows.length} — API: ${okApi}/${rows.length}`);
if (failed.length) { console.error("Fallos:", failed); process.exit(1); }
process.exit(0);
