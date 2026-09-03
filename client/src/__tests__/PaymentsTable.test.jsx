import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PaymentsTable } from "../components/PaymentsTable.jsx";

const payments = [
  { id: 1, pharmacy: "Droguería La Rebaja", product: "descongel", quantity: 2, unit_price: 10000, total_amount: 20000, date: "2026-09-01", status: "pendiente", references: [] },
  { id: 2, pharmacy: "Cruz Verde", product: "multidol400", quantity: 1, unit_price: 30000, total_amount: 30000, date: "2026-09-02", status: "procesado", references: [{ id: 9, reference: "REF-1" }] },
];

describe("PaymentsTable", () => {
  test("renderiza las filas con farmacia y referencia", () => {
    render(<PaymentsTable payments={payments} onEdit={() => {}} onDelete={() => {}} onToggleStatus={() => {}} />);
    expect(screen.getByText("Droguería La Rebaja")).toBeTruthy();
    expect(screen.getByText("Cruz Verde")).toBeTruthy();
    expect(screen.getByText("REF-1")).toBeTruthy();
  });

  test("filtra por producto", () => {
    render(<PaymentsTable payments={payments} onEdit={() => {}} onDelete={() => {}} onToggleStatus={() => {}} />);
    const selects = document.querySelectorAll("select");
    fireEvent.change(selects[0], { target: { value: "multidol400" } });
    expect(screen.queryByText("Droguería La Rebaja")).toBeNull();
    expect(screen.getByText("Cruz Verde")).toBeTruthy();
  });

  test("muestra mensaje cuando no hay resultados", () => {
    render(<PaymentsTable payments={[]} onEdit={() => {}} onDelete={() => {}} onToggleStatus={() => {}} />);
    expect(screen.getByText(/No hay pagos/i)).toBeTruthy();
  });

  test("el badge de estado llama a onToggleStatus", () => {
    const toggle = vi.fn();
    render(<PaymentsTable payments={payments} onEdit={() => {}} onDelete={() => {}} onToggleStatus={toggle} />);
    fireEvent.click(screen.getAllByTitle("Cambiar estado")[0]);
    expect(toggle).toHaveBeenCalledWith(payments[0]);
  });
});
