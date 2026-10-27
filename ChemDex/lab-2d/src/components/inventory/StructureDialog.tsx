import React, { useEffect, useRef } from "react";
export function StructureDialog({
  chemical,
  formula,
  onClose,
}: {
  chemical?: string;
  formula?: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="structure-dialog"
      onCancel={onClose}
      onClose={onClose}
    >
      <div className="session-heading">
        <h2>Cấu trúc chất · 3D</h2>
        <button onClick={onClose} aria-label="Đóng cấu trúc">
          ✕
        </button>
      </div>
      <iframe
        title="Trình xem cấu trúc phân tử 3D ChemDex"
        src={`/tien-ich/cau-truc-3d/?embed=1&${chemical ? `chemical=${encodeURIComponent(chemical)}` : `q=${encodeURIComponent(formula ?? "")}`}`}
        allow="fullscreen"
      />
    </dialog>
  );
}
