/**
 * ChemDex Data Editor - Firebase & Firestore Service
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state } from "./state.js";
import { showToast } from "./utils.js";

const firebaseConfig = {
  apiKey: "AIzaSyDDPIztE_5W21dxSmPP3hx6wtMQIhnByi8",
  authDomain: "chemdex-1710b.firebaseapp.com",
  projectId: "chemdex-1710b",
  storageBucket: "chemdex-1710b.firebasestorage.app",
  messagingSenderId: "514538842769",
  appId: "1:514538842769:web:f2283b968401a1d2f2ed30",
  measurementId: "G-LMTDS0NZRG",
};

export const COLLECTION_NAME = "chemDexElements";

let app = null;
let auth = null;
let db = null;
let googleProvider = null;
let isInitialized = false;

export function initFirebase() {
  if (isInitialized) return { app, auth, db };
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();

    onAuthStateChanged(auth, (user) => {
      state.setCurrentUser(user);
    });

    isInitialized = true;
  } catch (err) {
    console.warn("Failed to initialize Firebase:", err);
    state.setCloudStatus("offline");
  }
  return { app, auth, db };
}

export async function loginWithGoogle() {
  if (!auth) initFirebase();
  try {
    const res = await signInWithPopup(auth, googleProvider);
    showToast(`Đăng nhập thành công: ${res.user.displayName || res.user.email}`, "success");
    return res.user;
  } catch (err) {
    console.error("Google login failed:", err);
    showToast("Đăng nhập thất bại: " + (err.message || err), "error");
    throw err;
  }
}

export async function loginAnonymouslyUser() {
  if (!auth) initFirebase();
  try {
    const res = await signInAnonymously(auth);
    showToast("Đăng nhập ẩn danh thành công", "success");
    return res.user;
  } catch (err) {
    console.error("Anonymous login failed:", err);
    showToast("Đăng nhập ẩn danh thất bại", "error");
    throw err;
  }
}

export async function logoutUser() {
  if (!auth) return;
  try {
    await signOut(auth);
    showToast("Đã đăng xuất", "info");
  } catch (err) {
    console.error("Logout failed:", err);
  }
}

/**
 * Loads all elements from Firestore chemDexElements collection once.
 * Gracefully falls back to offline if network fails.
 */
export async function loadCloudDataOnce() {
  if (!db) initFirebase();
  if (!db) {
    state.setCloudStatus("offline");
    return new Map();
  }

  try {
    state.setCloudStatus("connecting");
    const snapshot = await getDocs(collection(db, COLLECTION_NAME));
    const cloudMap = new Map();

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const symbol = (data.symbol || docSnap.id).toUpperCase();
      if (data.data) {
        cloudMap.set(symbol, data.data);
      }
    });

    state.cloudDataMap = cloudMap;
    state.setCloudStatus("synced");
    return cloudMap;
  } catch (err) {
    console.warn("Firestore chemDexElements collection read failed, using local fallback:", err);
    state.setCloudStatus("offline");
    return new Map();
  }
}

/**
 * Generates empty placeholder data for elements without a detailed file.
 */
export function createEmptyElementPlaceholder(meta) {
  return {
    number: meta.number,
    symbol: meta.symbol,
    nameVi: meta.nameVi || "",
    nameEn: meta.nameEn || "",
    mass: null,
    category: meta.category || "unknown",
    hasData: false,
    general: {
      latinName: "",
      englishName: meta.nameEn || "",
      electronConfig: "",
      isotope: "",
      group: meta.xpos ? meta.xpos - 1 : 1,
      period: meta.ypos ? (meta.ypos <= 8 ? meta.ypos - 1 : 7) : 1,
      block: "s",
      state: "Rắn",
      oxidation: "",
      electronegativity: null,
      density: "",
      meltingPoint: "",
      boilingPoint: "",
    },
    history: {
      discoverer: "",
      year: "",
      discoveryLocation: "",
      description: "",
    },
    structure: {
      protons: meta.number,
      neutrons: 0,
      electrons: meta.number,
      electronShells: [1],
      lattice: "",
    },
    occurrence: {
      description: "",
      simple: [],
      compounds: [],
      ores: [],
    },
    physical: "",
    chemical: "",
    preparations: {
      description: "",
    },
    recognition: [],
    reactions: [],
    applications: [],
    notes: "",
  };
}

/**
 * Loads element data for a symbol:
 * 1. Working copy if already exists in memory
 * 2. Cloud data if present in state.cloudDataMap
 * 3. Local data/elements/XXX_Symbol.json
 * 4. Placeholder if missing
 */
export async function ensureElementData(symbol) {
  const sym = symbol.toUpperCase();

  // If already in working copies, return it
  if (state.workingCopies.has(sym)) {
    return state.workingCopies.get(sym);
  }

  // 1. Check cloud data
  if (state.cloudDataMap.has(sym)) {
    const cloudData = state.cloudDataMap.get(sym);
    state.setInitialElementData(sym, cloudData);
    return state.workingCopies.get(sym);
  }

  // 2. Fallback to local JSON (only if manifest indicates element has local data file)
  const meta = state.getElementMeta(sym);
  if (!meta) return null;

  if (meta.file && meta.hasData) {
    try {
      const res = await fetch(`./data/${meta.file}`, { cache: "no-store" });
      if (res.ok) {
        const localData = await res.json();
        // Merge meta fields into data
        const merged = {
          ...localData,
          number: meta.number,
          symbol: meta.symbol,
          nameVi: localData.nameVi || meta.nameVi,
          nameEn: localData.nameEn || meta.nameEn,
          category: localData.category || meta.category,
          hasData: true,
        };
        state.setInitialElementData(sym, merged);
        return state.workingCopies.get(sym);
      }
    } catch (err) {
      console.warn(`Failed to fetch local file for ${sym}:`, err);
    }
  }

  // 3. Create empty placeholder
  const placeholder = createEmptyElementPlaceholder(meta);
  state.setInitialElementData(sym, placeholder);
  return state.workingCopies.get(sym);
}

/**
 * Writes ONE element to Firestore chemDexElements/{symbol}.
 * Crucial: Only invoked on explicit user save button click!
 */
export async function saveElementToCloud(symbol) {
  if (!db) initFirebase();
  const sym = symbol.toUpperCase();
  const working = state.getWorkingCopy(sym);
  const meta = state.getElementMeta(sym);

  if (!working) {
    throw new Error(`Không tìm thấy dữ liệu của nguyên tố ${sym}`);
  }

  const user = state.currentUser;
  const docRef = doc(db, COLLECTION_NAME, sym);

  const payload = {
    symbol: sym,
    number: working.number || meta?.number || 0,
    data: working,
    updatedAt: serverTimestamp(),
    updatedBy: user ? user.email || user.uid : "anonymous_admin",
  };

  await setDoc(docRef, payload, { merge: true });
  state.markSaved(sym);
  showToast(`Đã lưu ${sym} (${working.nameVi || working.nameEn || ""}) lên Firebase`, "success");
  return true;
}

/**
 * Saves all dirty elements to Firestore in batch.
 */
export async function saveAllDirtyToCloud() {
  if (!db) initFirebase();
  const dirtyList = state.getDirtyList();
  if (dirtyList.length === 0) {
    showToast("Không có thay đổi nào cần lưu", "info");
    return 0;
  }

  const user = state.currentUser;
  const batch = writeBatch(db);
  const savedSymbols = [];

  for (const sym of dirtyList) {
    const working = state.getWorkingCopy(sym);
    const meta = state.getElementMeta(sym);
    if (!working) continue;

    const docRef = doc(db, COLLECTION_NAME, sym);
    batch.set(
      docRef,
      {
        symbol: sym,
        number: working.number || meta?.number || 0,
        data: working,
        updatedAt: serverTimestamp(),
        updatedBy: user ? user.email || user.uid : "anonymous_admin",
      },
      { merge: true }
    );
    savedSymbols.push(sym);
  }

  await batch.commit();

  savedSymbols.forEach((sym) => {
    state.markSaved(sym);
  });

  showToast(`Đã lưu thành công ${savedSymbols.length} nguyên tố lên Firebase`, "success");
  return savedSymbols.length;
}

/**
 * Reloads document from Firestore for a specific element.
 */
export async function reloadElementFromCloud(symbol) {
  if (!db) initFirebase();
  const sym = symbol.toUpperCase();
  const docRef = doc(db, COLLECTION_NAME, sym);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists() && docSnap.data().data) {
    const cloudData = docSnap.data().data;
    state.setInitialElementData(sym, cloudData);
    showToast(`Đã tải lại dữ liệu ${sym} từ Cloud`, "success");
    return cloudData;
  } else {
    showToast(`Không tìm thấy dữ liệu Cloud của ${sym}`, "warning");
    return null;
  }
}
