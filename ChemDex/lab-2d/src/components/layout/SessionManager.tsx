import React, { useState, useEffect, useRef } from "react";
import {
  listSessions,
  saveSession,
  makeSession,
  restoreSession,
  deleteSession,
  startAutosave,
  type LabSessionV1,
} from "../../services/labSessions";
import { useLabStore } from "../../store/useLabStore";
export function SessionManager() {
  const [open, setOpen] = useState(false),
    [sessions, setSessions] = useState<LabSessionV1[]>([]),
    [message, setMessage] = useState(""),
    [name, setName] = useState("Phiên thực hành"),
    [panel, setPanel] = useState<"inventory" | "inspector" | null>(null);
  const paused = useLabStore((s) => s.simulationPaused),
    setPaused = useLabStore((s) => s.setSimulationPaused);
  const file = useRef<HTMLInputElement>(null),
    dialog = useRef<HTMLDialogElement>(null);
  const refresh = () =>
    listSessions()
      .then((items) =>
        setSessions(items.sort((a, b) => b.savedAt.localeCompare(a.savedAt))),
      )
      .catch(() =>
        setMessage(
          "Trình duyệt không cho phép lưu phiên. Bạn vẫn có thể xuất file JSON.",
        ),
      );
  useEffect(() => {
    try {
      document.documentElement.dataset.theme = JSON.parse(
        localStorage.getItem("chemdex:theme") ?? '"light"',
      );
    } catch {}
    let live = true;
    listSessions()
      .then((items) => {
        if (
          live &&
          items.some(
            (item) =>
              item.id === "autosave" &&
              Object.keys(item.state.equipment).length,
          )
        )
          setMessage("Có phiên tự lưu trước đó. Mở “Phiên lab” để khôi phục.");
      })
      .catch(() => {});
    const stop = startAutosave((text) => live && setMessage(text));
    return () => {
      live = false;
      stop();
    };
  }, []);
  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      void refresh();
    } else dialog.current?.close();
  }, [open]);
  const togglePanel = (value: "inventory" | "inspector") => {
    const next = panel === value ? null : value;
    setPanel(next);
    document
      .querySelector(".lab-app")
      ?.setAttribute("data-mobile-panel", next ?? "");
  };
  const exportFile = () => {
    const value = makeSession(name, crypto.randomUUID());
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
    );
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `chemdex-session-${Date.now()}.json`,
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    try {
      if (selected.size > 5_000_000) throw new Error("File phiên tối đa 5 MB.");
      const value = JSON.parse(await selected.text());
      if (
        Object.keys(useLabStore.getState().equipment).length &&
        !confirm("Thay bàn hiện tại bằng phiên trong file?")
      )
        return;
      const session = restoreSession(value);
      await saveSession({ ...session, id: crypto.randomUUID() });
      setMessage("Đã nhập phiên. Mô phỏng đang tạm dừng.");
      await refresh();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      event.target.value = "";
    }
  };
  return (
    <>
      <div className="session-toolbar">
        <a href="/">← Bảng tuần hoàn</a>
        <a href="/tien-ich/cau-truc-3d/">Cấu trúc 3D</a>
        <a href="/on-tap/">Ôn tập</a>
        <button
          className="mobile-only"
          onClick={() => togglePanel("inventory")}
        >
          Kho dụng cụ
        </button>
        <button
          className="mobile-only"
          onClick={() => togglePanel("inspector")}
        >
          Thông số
        </button>
        <button onClick={() => setPaused(!paused)}>
          {paused ? "▶ Tiếp tục" : "Ⅱ Tạm dừng"}
        </button>
        <button onClick={() => setOpen(true)}>▣ Phiên lab</button>
        <button
          aria-label="Đổi chế độ sáng tối"
          onClick={() => {
            const theme =
              document.documentElement.dataset.theme === "dark"
                ? "light"
                : "dark";
            document.documentElement.dataset.theme = theme;
            try {
              localStorage.setItem("chemdex:theme", JSON.stringify(theme));
            } catch {}
          }}
        >
          ◐
        </button>
        <span role="status">{message}</span>
      </div>
      <dialog
        ref={dialog}
        className="session-dialog"
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
      >
        <div className="session-heading">
          <h2>Lưu & khôi phục phiên lab</h2>
          <button onClick={() => setOpen(false)} aria-label="Đóng phiên lab">
            ✕
          </button>
        </div>
        <p>
          Phiên lưu dụng cụ, lượng chất, tiến độ và ghi chú trên máy này. Khi mở
          lại, mô phỏng được tạm dừng để kiểm tra.
        </p>
        <label>
          Tên phiên{" "}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={160}
          />
        </label>
        <div className="session-actions">
          <button
            onClick={async () => {
              try {
                await saveSession(makeSession(name, crypto.randomUUID()));
                setMessage("Đã lưu phiên.");
                await refresh();
              } catch {
                setMessage("Không thể lưu phiên. Hãy xuất file JSON.");
              }
            }}
          >
            Lưu phiên mới
          </button>
          <button onClick={exportFile}>Xuất file phiên JSON</button>
          <button onClick={() => file.current?.click()}>Nhập file phiên</button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={importFile}
          />
        </div>
        <p role="status">{message}</p>
        <div className="session-list">
          {sessions.map((session) => (
            <div key={session.id}>
              <div>
                <strong>{session.name}</strong>
                <small>
                  {new Date(session.savedAt).toLocaleString("vi-VN")} ·{" "}
                  {Object.keys(session.state.equipment).length} dụng cụ
                </small>
              </div>
              <button
                onClick={() => {
                  if (
                    Object.keys(useLabStore.getState().equipment).length &&
                    !confirm("Thay bàn hiện tại bằng phiên đã lưu?")
                  )
                    return;
                  try {
                    restoreSession(session);
                    setMessage("Đã khôi phục. Nhấn Tiếp tục khi sẵn sàng.");
                    setOpen(false);
                  } catch (error) {
                    setMessage((error as Error).message);
                  }
                }}
              >
                Mở
              </button>
              <button
                aria-label={`Xóa ${session.name}`}
                onClick={async () => {
                  if (confirm("Xóa phiên đã lưu này?")) {
                    await deleteSession(session.id);
                    await refresh();
                  }
                }}
              >
                Xóa
              </button>
            </div>
          ))}
          {!sessions.length && <p>Chưa có phiên được lưu.</p>}
        </div>
      </dialog>
    </>
  );
}
