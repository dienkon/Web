import {
  useLabStore,
  captureSnapshot,
  type LabSnapshot,
} from "../store/useLabStore";
import { EXPERIMENTS_CATALOG } from "../data/experiments";
export interface LabSessionV1 {
  version: 1;
  id: string;
  name: string;
  savedAt: string;
  state: LabSnapshot;
}
const types = new Set([
  "beaker",
  "erlenmeyer_flask",
  "test_tube",
  "graduated_cylinder",
  "burette",
  "pipette",
  "dropper",
  "funnel",
  "watch_glass",
  "evaporating_dish",
  "analytical_balance",
  "bunsen_burner",
  "hot_plate",
  "ph_meter",
  "thermometer",
  "stirring_rod",
  "spatula",
  "reagent_bottle",
  "wash_bottle",
  "test_tube_rack",
  "separatory_funnel",
  "ph_paper",
]);
export function validateSession(value: unknown): LabSessionV1 {
  const session = value as LabSessionV1;
  if (
    !session ||
    session.version !== 1 ||
    typeof session.id !== "string" ||
    session.id.length > 100 ||
    typeof session.name !== "string" ||
    session.name.length > 160 ||
    !Number.isFinite(Date.parse(session.savedAt))
  )
    throw new Error("File phiên không hợp lệ hoặc khác phiên bản hỗ trợ.");
  const state = session.state;
  if (
    !state ||
    !state.equipment ||
    Array.isArray(state.equipment) ||
    typeof state.equipment !== "object" ||
    Object.keys(state.equipment).length > 200 ||
    !Array.isArray(state.history) ||
    state.history.length > 20000 ||
    !Array.isArray(state.spillPuddles) ||
    typeof state.studentNotes !== "string" ||
    state.studentNotes.length > 100000 ||
    !["free", "guided"].includes(state.activeMode) ||
    typeof state.stepCompleted !== "boolean" ||
    !Number.isInteger(state.currentStepIndex) ||
    state.currentStepIndex < 0
  )
    throw new Error("Trạng thái phiên không hợp lệ.");
  for (const [id, eq] of Object.entries(state.equipment)) {
    if (
      ["__proto__", "constructor", "prototype"].includes(id) ||
      id !== eq.id ||
      !types.has(eq.type) ||
      !Array.isArray(eq.contents) ||
      eq.contents.length > 300
    )
      throw new Error("Dụng cụ không hợp lệ.");
    for (const key of [
      "x",
      "y",
      "width",
      "height",
      "volume_ml",
      "capacity_ml",
      "mass_g",
      "temperature_c",
      "ph",
    ] as const)
      if (!Number.isFinite(eq[key]))
        throw new Error("Thông số dụng cụ phải là số hữu hạn.");
    if (
      eq.volume_ml < 0 ||
      eq.volume_ml > eq.capacity_ml + 1e-6 ||
      eq.mass_g < 0 ||
      eq.capacity_ml < 0 ||
      eq.temperature_c < -273.15 ||
      eq.width <= 0 ||
      eq.height <= 0
    )
      throw new Error("Thông số dụng cụ ngoài phạm vi.");
    for (const item of eq.contents) {
      if (
        typeof item.formula !== "string" ||
        item.formula.length > 150 ||
        !["aq", "s", "l", "g"].includes(item.state) ||
        !Number.isFinite(item.moles) ||
        item.moles < 0 ||
        !Number.isFinite(item.mass_g) ||
        item.mass_g < 0
      )
        throw new Error("Lượng chất không hợp lệ.");
    }
  }
  for (const entry of state.history)
    if (
      !entry ||
      typeof entry.id !== "string" ||
      !Number.isFinite(entry.timestamp) ||
      typeof entry.details_vi !== "string" ||
      typeof entry.details_en !== "string"
    )
      throw new Error("Nhật ký không hợp lệ.");
  if (state.activeExperiment) {
    const exp = EXPERIMENTS_CATALOG.find(
      (e) => e.id === state.activeExperiment?.id,
    );
    if (!exp || state.currentStepIndex >= exp.steps.length)
      throw new Error("Bài thực hành không còn tương thích.");
    state.activeExperiment = exp;
  } else if (state.activeMode === "guided")
    throw new Error("Thiếu bài thực hành.");
  return structuredClone(session);
}
async function db() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("chemdex-platform", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("sessions", { keyPath: "id" });
      request.result.createObjectStore("structures");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function operation<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await db();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction("sessions", mode);
      let result: T;
      const request = fn(transaction.objectStore("sessions"));
      request.onsuccess = () => {
        result = request.result;
      };
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}
export const listSessions = () =>
  operation("readonly", (store) => store.getAll()) as Promise<LabSessionV1[]>;
export const deleteSession = (id: string) =>
  operation("readwrite", (store) => store.delete(id));
export function makeSession(
  name = "Phiên tự lưu",
  id = "autosave",
): LabSessionV1 {
  return {
    version: 1,
    id,
    name: name.trim().slice(0, 160) || "Phiên thực hành",
    savedAt: new Date().toISOString(),
    state: captureSnapshot(useLabStore.getState()),
  };
}
export const saveSession = (session: LabSessionV1) =>
  operation("readwrite", (store) => store.put(validateSession(session)));
export function restoreSession(value: unknown) {
  const session = validateSession(value);
  const state = session.state;
  useLabStore.setState({
    ...state,
    simulationPaused: true,
    undoStack: [],
    redoStack: [],
    isTransferModalOpen: false,
    transferSourceId: null,
    transferTargetId: null,
    activePourVfx: null,
    draggedChemicalId: null,
  });
  return session;
}
export function startAutosave(onError: (message: string) => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let saving = false,
    dirty = false,
    stopped = false;
  const flush = async () => {
    if (saving || stopped) return;
    clearTimeout(timer);
    timer = undefined;
    saving = true;
    dirty = false;
    try {
      await saveSession(makeSession());
    } catch {
      onError("Không thể tự lưu. Hãy xuất file phiên để giữ công việc.");
    } finally {
      saving = false;
      if (dirty && !stopped) timer = setTimeout(flush, 1500);
    }
  };
  const unsubscribe = useLabStore.subscribe((state, previous) => {
    if (
      state.equipment === previous.equipment &&
      state.history === previous.history &&
      state.studentNotes === previous.studentNotes &&
      state.currentStepIndex === previous.currentStepIndex &&
      state.spillPuddles === previous.spillPuddles
    )
      return;
    dirty = true;
    if (!timer)
      timer = setTimeout(() => {
        timer = undefined;
        void flush();
      }, 2000);
  });
  const visibility = () => {
    if (document.hidden && dirty) void flush();
  };
  document.addEventListener("visibilitychange", visibility);
  return () => {
    stopped = true;
    unsubscribe();
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", visibility);
  };
}
