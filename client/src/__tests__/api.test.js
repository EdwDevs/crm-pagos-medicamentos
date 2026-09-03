import { describe, expect, test } from "vitest";
import { PRODUCTS, STATUS, fmtMoney, fmtDate } from "../api.js";

describe("catálogo", () => {
  test("expone los 3 productos del CRM original", () => {
    expect(Object.keys(PRODUCTS).sort()).toEqual(["descongel", "multidol400", "multidol800"]);
    expect(PRODUCTS.descongel.name).toBe("Descongel x100");
    expect(PRODUCTS.multidol400.name).toBe("Multidol 400mg");
    expect(PRODUCTS.multidol800.name).toBe("Multidol 800mg");
  });

  test("estados pendiente y procesado", () => {
    expect(Object.keys(STATUS).sort()).toEqual(["pendiente", "procesado"]);
  });
});

describe("formato", () => {
  test("fmtMoney formatea pesos colombianos", () => {
    const s = fmtMoney(125000);
    expect(s).toContain("125");
    expect(s).toContain("000");
    expect(fmtMoney(0)).toBeTruthy();
  });

  test("fmtDate maneja fechas ISO", () => {
    expect(fmtDate("2026-09-01")).toContain("2026");
    expect(fmtDate("")).toBe("");
  });
});
