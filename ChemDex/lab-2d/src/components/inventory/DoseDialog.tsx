import React, { useState, useEffect, useRef } from "react";
import { CHEMICAL_CATALOG } from "../../data/chemicals";
import { useLabStore } from "../../store/useLabStore";
export function DoseDialog({
  chemicalId,
  onClose,
}: {
  chemicalId: string;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("10"),
    [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const chemical = CHEMICAL_CATALOG.find((c) => c.id === chemicalId);
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  if (!chemical) return null;
  const liquid = ["aqueous", "liquid"].includes(chemical.phase_STP);
  return (
    <dialog
      ref={dialog}
      className="session-dialog"
      style={{ maxWidth: 430 }}
      onCancel={onClose}
      onClose={onClose}
    >
      <div className="session-heading">
        <h2>
          {chemical.formula} · {chemical.name_vi}
        </h2>
        <button onClick={onClose} aria-label="Đóng">
          ✕
        </button>
      </div>
      <p>Chọn lượng chất trước khi thêm vào bình đang chọn hoặc tạo cốc mới.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const value = Number(amount);
          if (
            !Number.isFinite(value) ||
            value <= 0 ||
            value > (liquid ? 250 : 100)
          ) {
            setError(
              `Nhập lượng lớn hơn 0 và không quá ${liquid ? "250 mL" : "100 g"}.`,
            );
            return;
          }
          const state = useLabStore.getState();
          let id = state.selectedEquipmentId;
          const vessel = id ? state.equipment[id] : null;
          if (!vessel?.isContainer) id = state.addEquipment("beaker");
          if (
            liquid &&
            useLabStore.getState().equipment[id!]?.volume_ml + value >
              useLabStore.getState().equipment[id!]?.capacity_ml
          ) {
            setError(
              "Bình không đủ dung tích. Hãy chọn bình khác hoặc giảm lượng chất.",
            );
            return;
          }
          state.addChemicalToEquipment(
            id!,
            chemicalId,
            liquid ? value : 0,
            liquid ? 0 : value,
          );
          onClose();
        }}
      >
        <label>
          Lượng ({liquid ? "mL" : "g"}){" "}
          <input
            autoFocus
            type="number"
            step="any"
            min="0.001"
            max={liquid ? 250 : 100}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <p role="alert">{error}</p>
        <button type="submit">Thêm vào bàn thí nghiệm</button>
      </form>
    </dialog>
  );
}
