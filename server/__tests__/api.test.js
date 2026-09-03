import { createDb } from "../src/db.js";
import { createApp } from "../src/app.js";
import request from "supertest";

let app;

beforeEach(() => {
  app = createApp(createDb(":memory:"));
});

const seedRefs = async () => {
  const ref = await request(app)
    .post("/api/references")
    .send({ pharmacy: "Droguería La Rebaja", reference: "REF-001", value: 100000 });
  return ref.body.id;
};

describe("GET /api/products", () => {
  test("expone los 3 productos del CRM original", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(["descongel", "multidol400", "multidol800"]);
    expect(res.body.descongel.name).toBe("Descongel x100");
  });
});

describe("referencias de pago", () => {
  test("crea una referencia con valor y la lista por farmacia", async () => {
    const id = await seedRefs();
    const ph = await request(app).get("/api/pharmacies");
    const list = await request(app).get(`/api/references?pharmacyId=${ph.body[0].id}`);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({ id, reference: "REF-001", value: 100000, active: 1 });
  });

  test("rechaza referencias duplicadas en la misma farmacia (sin distinguir mayúsculas)", async () => {
    await seedRefs();
    const res = await request(app)
      .post("/api/references")
      .send({ pharmacy: "droguería la rebaja", reference: "ref-001" });
    expect(res.status).toBe(409);
  });

  test("permite la misma referencia en farmacias distintas", async () => {
    await seedRefs();
    const res = await request(app)
      .post("/api/references")
      .send({ pharmacy: "Cruz Verde", reference: "REF-001" });
    expect(res.status).toBe(201);
  });

  test("no permite borrar una referencia en uso, pero sí desactivarla", async () => {
    const id = await seedRefs();
    await request(app).post("/api/payments").send({
      pharmacy: "Droguería La Rebaja",
      product: "multidol400",
      quantity: 2,
      unitPrice: 50000,
      date: "2026-09-01",
      status: "procesado",
      referenceIds: [id],
    });
    const del = await request(app).delete(`/api/references/${id}`);
    expect(del.status).toBe(409);
    const patch = await request(app).patch(`/api/references/${id}`).send({ active: false });
    expect(patch.status).toBe(200);
  });
});

describe("pagos", () => {
  const valid = { pharmacy: "Farmacia Central", product: "descongel", quantity: 3, unitPrice: 25000, date: "2026-09-01", status: "pendiente" };

  test("crea un pago y calcula el total (cantidad x unitario)", async () => {
    const res = await request(app).post("/api/payments").send(valid);
    expect(res.status).toBe(201);
    expect(res.body.total_amount).toBe(75000);
  });

  test("rechaza estado procesado sin referencias", async () => {
    const res = await request(app).post("/api/payments").send({ ...valid, status: "procesado" });
    expect(res.status).toBe(400);
    expect(res.body.errors.join(" ")).toMatch(/referencia/i);
  });

  test("acepta procesado con referencia de la misma farmacia", async () => {
    const id = await seedRefs();
    const res = await request(app).post("/api/payments").send({
      ...valid,
      pharmacy: "Droguería La Rebaja",
      status: "procesado",
      referenceIds: [id],
    });
    expect(res.status).toBe(201);
  });

  test("rechaza referencia de otra farmacia", async () => {
    const id = await seedRefs();
    const res = await request(app).post("/api/payments").send({ ...valid, status: "procesado", referenceIds: [id] });
    expect(res.status).toBe(400);
  });

  test.each([
    ["sin farmacia", { pharmacy: "" }],
    ["producto inválido", { product: "jarabe" }],
    ["cantidad cero", { quantity: 0 }],
    ["precio negativo", { unitPrice: -1 }],
    ["fecha inválida", { date: "01/09/2026" }],
  ])("valida: %s", async (_name, patch) => {
    const res = await request(app).post("/api/payments").send({ ...valid, ...patch });
    expect(res.status).toBe(400);
  });

  test("normaliza el nombre de farmacia y no crea duplicados", async () => {
    await request(app).post("/api/payments").send(valid);
    await request(app).post("/api/payments").send({ ...valid, pharmacy: "  farmacia   central " });
    const ph = await request(app).get("/api/pharmacies");
    expect(ph.body).toHaveLength(1);
    expect(ph.body[0].name).toBe("Farmacia Central");
  });

  test("edita, cambia estado y elimina un pago", async () => {
    const created = await request(app).post("/api/payments").send(valid);
    const id = created.body.id;

    const upd = await request(app).put(`/api/payments/${id}`).send({ quantity: 5 });
    expect(upd.status).toBe(200);
    const detail = await request(app).get(`/api/payments/${id}`);
    expect(detail.body.total_amount).toBe(125000);

    const st = await request(app).patch(`/api/payments/${id}/status`).send({ status: "procesado" });
    expect(st.status).toBe(200);

    const del = await request(app).delete(`/api/payments/${id}`);
    expect(del.status).toBe(200);
    expect((await request(app).get(`/api/payments/${id}`)).status).toBe(404);
  });

  test("filtra por producto, estado, fechas y búsqueda", async () => {
    await request(app).post("/api/payments").send(valid);
    await request(app).post("/api/payments").send({ ...valid, product: "multidol800", date: "2026-08-15" });

    expect((await request(app).get("/api/payments?product=multidol800")).body).toHaveLength(1);
    expect((await request(app).get("/api/payments?from=2026-09-01&to=2026-09-30")).body).toHaveLength(1);
    expect((await request(app).get("/api/payments?search=central")).body).toHaveLength(2);
    expect((await request(app).get("/api/payments?status=procesado")).body).toHaveLength(0);
  });
});

describe("GET /api/stats", () => {
  test("agrupa por producto, estado y mes", async () => {
    await request(app).post("/api/payments").send({ pharmacy: "A", product: "descongel", quantity: 2, unitPrice: 10000, date: "2026-08-05", status: "pendiente" });
    await request(app).post("/api/payments").send({ pharmacy: "B", product: "multidol400", quantity: 1, unitPrice: 30000, date: "2026-09-01", status: "procesado", referenceIds: [(await request(app).post("/api/references").send({ pharmacy: "B", reference: "X" })).body.id] });

    const res = await request(app).get("/api/stats");
    expect(res.status).toBe(200);
    expect(res.body.totals.total).toBe(50000);
    expect(res.body.byProduct).toHaveLength(2);
    expect(res.body.monthly.map((m) => m.month)).toEqual(["2026-08", "2026-09"]);
  });
});
