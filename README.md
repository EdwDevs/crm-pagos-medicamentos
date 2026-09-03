# CRM Pagos Medicamentos

CRM full-stack para el control y revisión de pagos de medicamentos, basado en el modelo de datos de [CRM_Medicamentos](../CRM_Medicamentos-duplicate).

## Productos (idénticos al CRM original)

| Clave | Producto |
|---|---|
| `descongel` | ❄️ Descongel x100 |
| `multidol400` | 💊 Multidol 400mg |
| `multidol800` | 💊 Multidol 800mg |

## Estructura

```
crm-pagos-medicamentos/
├── server/          API REST: Node.js + Express + SQLite (node:sqlite, sin dependencias nativas)
│   ├── src/db.js           Esquema y catálogo de productos
│   ├── src/validation.js   Validación de pagos
│   ├── src/routes/         payments, references/pharmacies, stats
│   └── __tests__/          Jest + Supertest (18 pruebas)
└── client/          Frontend React + Vite + Bootstrap
    ├── src/components/     Dashboard, PaymentsTable, PaymentForm, ReferencesPanel
    └── src/__tests__/      Vitest + Testing Library (8 pruebas)
```

## Modelo de datos

- **payments**: farmacia, producto, cantidad, valor unitario, total (cantidad × unitario), fecha, estado (`pendiente`/`procesado`), notas.
- **payment_references**: referencia + valor por farmacia, única por farmacia (sin distinción de mayúsculas), activable/desactivable. No se puede borrar si está en uso.
- **Regla heredada del CRM original:** un pago en estado `procesado` exige al menos una referencia de pago de la misma farmacia.

## Uso

```bash
# Terminal 1 — API en http://localhost:4000
cd server && npm install && npm start

# Terminal 2 — Frontend en http://localhost:5173 (proxy /api -> 4000)
cd client && npm install && npm run dev
```

## Pruebas

```bash
cd server && npm test    # 18 pruebas de API (Jest + Supertest)
cd client && npm test    # 8 pruebas de UI (Vitest)
cd client && npm run build
```

## Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/products` | Catálogo de productos |
| GET/POST/PUT/DELETE | `/api/payments[/:id]` | CRUD de pagos (filtros: product, status, pharmacyId, from, to, search) |
| PATCH | `/api/payments/:id/status` | Cambiar estado |
| GET/POST | `/api/pharmacies` | Farmacias (autocreadas al registrar pagos) |
| GET/POST/PATCH/DELETE | `/api/references[/:id]` | Referencias de pago por farmacia |
| GET | `/api/stats` | Totales por producto, estado, mes y top farmacias |
