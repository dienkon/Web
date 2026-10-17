import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase/config";
import { FirestoreCache } from "./firebase/firestoreCache";
import { Folder, Exam } from "../types";
import { deleteExam } from "./examService";

const FOLDERS_COLLECTION = "folders";
const EXAMS_COLLECTION = "exams";

export const getOrCreateParentFolder = async (parentUsername: string, parentDisplayName: string): Promise<string> => {
  // Try to find the "Phụ huynh" root folder
  let rootFolderId: string | null = null;
  const rootQuery = query(
    collection(db, FOLDERS_COLLECTION),
    where("name", "==", "Phụ huynh"),
    where("parentId", "==", null)
  );
  const rootSnap = await getDocs(rootQuery);
  console.warn(`[Firestore] READ_MANY (${rootSnap.size} docs): ${FOLDERS_COLLECTION} (find root "Phụ huynh" folder)`);
  if (rootSnap.empty) {
    const newRoot = await createFolder({
      name: "Phụ huynh",
      color: "bg-amber-500",
      description: "Thư mục gốc chứa đề thi của các phụ huynh",
    });
    rootFolderId = newRoot.id;
  } else {
    rootFolderId = rootSnap.docs[0].id;
  }

  // Try to find the specific parent's folder
  const parentFolderName = `${parentDisplayName} (${parentUsername})`;
  const parentFolderQuery = query(
    collection(db, FOLDERS_COLLECTION),
    where("name", "==", parentFolderName),
    where("parentId", "==", rootFolderId)
  );
  const parentSnap = await getDocs(parentFolderQuery);
  console.warn(`[Firestore] READ_MANY (${parentSnap.size} docs): ${FOLDERS_COLLECTION} (find parent folder "${parentFolderName}")`);
  if (parentSnap.empty) {
    const newParentFolder = await createFolder({
      name: parentFolderName,
      parentId: rootFolderId,
      color: "bg-blue-500",
      description: `Thư mục đề thi của phụ huynh ${parentDisplayName}`,
    });
    return newParentFolder.id;
  } else {
    return parentSnap.docs[0].id;
  }
};

/**
 * Gets or creates the student folder hierarchy: Drive / Học sinh / <Tên học sinh>
 * Used for storing retake and review exams non-publicly.
 */
export const getOrCreateStudentFolder = async (
  studentUsername: string,
  studentDisplayName?: string
): Promise<string> => {
  // 1. Find or create root folder "Học sinh"
  let rootFolderId: string | null = null;
  const rootQuery = query(
    collection(db, FOLDERS_COLLECTION),
    where("name", "==", "Học sinh"),
    where("parentId", "==", null)
  );
  const rootSnap = await getDocs(rootQuery);
  console.warn(`[Firestore] READ_MANY (${rootSnap.size} docs): ${FOLDERS_COLLECTION} (find root "Học sinh" folder)`);

  if (rootSnap.empty) {
    const newRoot = await createFolder({
      name: "Học sinh",
      color: "blue",
      description: "Thư mục gốc chứa đề thi ôn tập và làm lại của học sinh",
      parentId: null,
    });
    rootFolderId = newRoot.id;
  } else {
    rootFolderId = rootSnap.docs[0].id;
  }

  // 2. Find or create student's personal subfolder under "Học sinh"
  const studentFolderName = studentDisplayName && studentDisplayName.trim()
    ? `${studentDisplayName.trim()} (${studentUsername})`
    : studentUsername;

  const studentFolderQuery = query(
    collection(db, FOLDERS_COLLECTION),
    where("name", "==", studentFolderName),
    where("parentId", "==", rootFolderId)
  );
  const studentSnap = await getDocs(studentFolderQuery);
  console.warn(`[Firestore] READ_MANY (${studentSnap.size} docs): ${FOLDERS_COLLECTION} (find student folder "${studentFolderName}")`);

  if (studentSnap.empty) {
    const newStudentFolder = await createFolder({
      name: studentFolderName,
      parentId: rootFolderId,
      color: "emerald",
      description: `Thư mục lưu đề làm lại và ôn tập của học sinh ${studentDisplayName || studentUsername}`,
    });
    return newStudentFolder.id;
  } else {
    return studentSnap.docs[0].id;
  }
};

// Helper to sanitize payload and remove any undefined fields before Firestore operations
const sanitizePayload = (data: Record<string, any>) => {
  const sanitized: Record<string, any> = {};
  Object.keys(data).forEach((key) => {
    if (data[key] !== undefined) {
      sanitized[key] = data[key];
    }
  });
  return sanitized;
};

/**
 * Retrieves folders with optional ownerId and parentId filtering (supports lazy-loading child folders).
 */
export const getFolders = async (
  ownerId?: string | null,
  parentId?: string | null | "all"
): Promise<Folder[]> => {
  try {
    const conditions: any[] = [];
    if (ownerId) {
      conditions.push(where("ownerId", "==", ownerId));
    }
    if (parentId !== "all" && parentId !== undefined) {
      conditions.push(where("parentId", "==", parentId));
    }

    let q = query(collection(db, FOLDERS_COLLECTION), ...conditions);
    const snap = await getDocs(q);
    console.warn(`[Firestore] READ_MANY (${snap.size} docs): ${FOLDERS_COLLECTION} (ownerId: ${ownerId || 'all'}, parentId: ${parentId ?? 'null'})`);

    const folders = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Folder));

    folders.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });

    return folders;
  } catch (err) {
    console.error("Lỗi khi tải danh mục/thư mục:", err);
    return [];
  }
};

export const getFolder = async (folderId: string): Promise<Folder | null> => {
  try {
    const docRef = doc(db, FOLDERS_COLLECTION, folderId);
    const snap = await getDoc(docRef);
    console.warn(`[Firestore] READ (1 doc): ${FOLDERS_COLLECTION}/${folderId} (found: ${snap.exists()})`);
    if (snap.exists()) {
      return { id: snap.id, ...(snap.data() as any) } as Folder;
    }
    return null;
  } catch (err) {
    console.error("Lỗi khi lấy thông tin thư mục:", err);
    return null;
  }
};

export const createFolder = async (
  folderData: Omit<Folder, "id" | "createdAt" | "updatedAt">
): Promise<Folder> => {
  const docRef = doc(collection(db, FOLDERS_COLLECTION));
  const rawPayload = {
    ...folderData,
    ownerId: folderData.ownerId || null,
    parentId: folderData.parentId || null,
    isPublic: Boolean(folderData.isPublic),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const payload = sanitizePayload(rawPayload);

  console.warn(`[Firestore] WRITE (1 doc): ${FOLDERS_COLLECTION}/${docRef.id}`, payload);
  await setDoc(docRef, payload);

  return {
    id: docRef.id,
    ...folderData,
    ownerId: folderData.ownerId || null,
    parentId: folderData.parentId || null,
    isPublic: Boolean(folderData.isPublic),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Folder;
};

export const updateFolder = async (
  folderId: string,
  updates: Partial<Folder>
): Promise<void> => {
  const docRef = doc(db, FOLDERS_COLLECTION, folderId);
  console.warn(`[Firestore] UPDATE (1 doc): ${FOLDERS_COLLECTION}/${folderId}`);
  const payload = sanitizePayload({
    ...updates,
    updatedAt: serverTimestamp(),
  });
  await updateDoc(docRef, payload);
};

/**
 * Toggles the public status of a folder for student access in "Kho đề".
 */
export const toggleFolderPublic = async (
  folderId: string,
  isPublic: boolean
): Promise<void> => {
  const docRef = doc(db, FOLDERS_COLLECTION, folderId);
  console.warn(`[Firestore] UPDATE (1 doc): ${FOLDERS_COLLECTION}/${folderId} -> isPublic: ${isPublic}`);
  await updateDoc(docRef, {
    isPublic,
    updatedAt: serverTimestamp(),
  });
  FirestoreCache.invalidatePrefix("public_folders:");
  FirestoreCache.invalidate("home:public_folders");
};

/**
 * Retrieves public folders with lazy-loading by parentId.
 * Used in student Home and "Kho đề" to browse folders without loading everything up front.
 * - At root (parentId is null/undefined): returns all public folders whose parent is not also public.
 * - Inside a folder (parentId given): returns all child subfolders of that parent.
 */
export const getPublicFolders = async (
  parentId?: string | null
): Promise<Folder[]> => {
  try {
    if (!parentId) {
      // 1. Root level on Student Home:
      // Fetch all public folders.
      const q = query(
        collection(db, FOLDERS_COLLECTION),
        where("isPublic", "==", true)
      );
      const snap = await getDocs(q);
      console.warn(`[Firestore] READ_MANY (${snap.size} docs): ${FOLDERS_COLLECTION} (all public folders at root)`);
      const allPublicFolders = snap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as any) } as Folder)
      );

      // A folder should appear at root if it has no parentId,
      // OR if its parentId is not among the public folders (i.e. parent is private/unshared).
      const publicIdSet = new Set(allPublicFolders.map((f) => f.id));
      const rootFolders = allPublicFolders.filter(
        (f) => !f.parentId || !publicIdSet.has(f.parentId)
      );

      rootFolders.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      return rootFolders;
    } else {
      // 2. Child folders inside a parent folder:
      // When a parent folder is public, all subfolders inside it should be accessible
      // unless explicitly marked isPublic === false.
      const q = query(
        collection(db, FOLDERS_COLLECTION),
        where("parentId", "==", parentId)
      );
      const snap = await getDocs(q);
      console.warn(`[Firestore] READ_MANY (${snap.size} docs): ${FOLDERS_COLLECTION} (subfolders of ${parentId})`);
      const subfolders = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) } as Folder))
        .filter((f) => f.isPublic !== false);

      subfolders.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      return subfolders;
    }
  } catch (err) {
    console.error("Lỗi khi tải danh sách thư mục công khai:", err);
    return [];
  }
};

/**
 * Retrieves published exams inside a specific folder (lazy loading on demand).
 */
export const getPublicExamsInFolder = async (
  folderId: string | null
): Promise<Exam[]> => {
  try {
    const conditions: any[] = [
      where("folderId", "==", folderId ?? null),
    ];
    const q = query(collection(db, EXAMS_COLLECTION), ...conditions);
    const snap = await getDocs(q);
    console.warn(`[Firestore] READ_MANY (${snap.size} docs): ${EXAMS_COLLECTION} (folderId: ${folderId ?? 'null'})`);
    const exams = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) } as Exam))
      .filter((ex) => ex.status !== "draft" && ex.status !== "unlisted");

    exams.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });

    return exams;
  } catch (err) {
    console.error("Lỗi khi tải danh sách bài thi trong thư mục:", err);
    return [];
  }
};

export const deleteFolder = async (
  folderId: string,
  moveExamsToParent: boolean = true
): Promise<void> => {
  // Get folder details to find parent
  const folderDoc = await getDoc(doc(db, FOLDERS_COLLECTION, folderId));
  console.warn(`[Firestore] READ (1 doc): ${FOLDERS_COLLECTION}/${folderId} (for folder deletion)`);
  const parentId = folderDoc.exists() ? (folderDoc.data()?.parentId || null) : null;

  // Move subfolders to parent folder
  const subfoldersQuery = query(collection(db, FOLDERS_COLLECTION), where("parentId", "==", folderId));
  const subfoldersSnap = await getDocs(subfoldersQuery);
  console.warn(`[Firestore] READ_MANY (${subfoldersSnap.size} docs): ${FOLDERS_COLLECTION} (subfolders to reparent)`);
  if (!subfoldersSnap.empty) {
    const batch = writeBatch(db);
    subfoldersSnap.docs.forEach((docItem) => {
      batch.update(docItem.ref, { parentId: parentId, updatedAt: serverTimestamp() });
    });
    console.warn(`[Firestore] BATCH_WRITE (${subfoldersSnap.size} docs): ${FOLDERS_COLLECTION} reparent`);
    await batch.commit();
  }

  // Move exams inside folder to parent or root
  if (moveExamsToParent) {
    const q = query(collection(db, EXAMS_COLLECTION), where("folderId", "==", folderId));
    const snap = await getDocs(q);
    console.warn(`[Firestore] READ_MANY (${snap.size} docs): ${EXAMS_COLLECTION} (exams to reparent)`);
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.docs.forEach((docItem) => {
        batch.update(docItem.ref, { folderId: parentId, updatedAt: serverTimestamp() });
      });
      console.warn(`[Firestore] BATCH_WRITE (${snap.size} docs): ${EXAMS_COLLECTION} reparent`);
      await batch.commit();
    }
  }

  const docRef = doc(db, FOLDERS_COLLECTION, folderId);
  console.warn(`[Firestore] DELETE (1 doc): ${FOLDERS_COLLECTION}/${folderId}`);
  await deleteDoc(docRef);
};

export const moveExamToFolder = async (
  examId: string,
  folderId: string | null
): Promise<void> => {
  const docRef = doc(db, EXAMS_COLLECTION, examId);
  console.warn(`[Firestore] UPDATE (1 doc): ${EXAMS_COLLECTION}/${examId} -> folderId: ${folderId}`);
  await updateDoc(docRef, {
    folderId: folderId || null,
    updatedAt: serverTimestamp(),
  });
  FirestoreCache.invalidatePrefix("query:exams");
  FirestoreCache.invalidatePrefix("doc:exams");
  FirestoreCache.invalidate("doc:system_stats:exams_summary");
};

export const bulkMoveExamsToFolder = async (
  examIds: string[],
  folderId: string | null
): Promise<void> => {
  if (examIds.length === 0) return;
  const batch = writeBatch(db);
  examIds.forEach((id) => {
    const docRef = doc(db, EXAMS_COLLECTION, id);
    batch.update(docRef, {
      folderId: folderId || null,
      updatedAt: serverTimestamp(),
    });
  });
  console.warn(`[Firestore] BATCH_WRITE (${examIds.length} docs): ${EXAMS_COLLECTION} bulkMove -> folderId: ${folderId}`);
  await batch.commit();
  FirestoreCache.invalidatePrefix("query:exams");
  FirestoreCache.invalidatePrefix("doc:exams");
  FirestoreCache.invalidate("doc:system_stats:exams_summary");
};

export const bulkDeleteExams = async (examIds: string[]): Promise<void> => {
  for (const id of examIds) {
    await deleteExam(id);
  }
};

export const toggleExamFeatured = async (
  examId: string,
  isFeatured: boolean
): Promise<void> => {
  const docRef = doc(db, EXAMS_COLLECTION, examId);
  console.warn(`[Firestore] UPDATE (1 doc): ${EXAMS_COLLECTION}/${examId} -> isFeatured: ${isFeatured}`);
  await updateDoc(docRef, {
    isFeatured: isFeatured,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Checks whether childFolderId is a descendant of ancestorFolderId in the given folder list.
 * Helps prevent circular loops when nesting/moving folders.
 */
export const isFolderDescendantOf = (
  childFolderId: string,
  ancestorFolderId: string,
  allFolders: Folder[]
): boolean => {
  if (childFolderId === ancestorFolderId) return true;
  let current = allFolders.find((f) => f.id === childFolderId);
  const visited = new Set<string>();
  while (current && current.parentId) {
    if (visited.has(current.id)) break;
    visited.add(current.id);
    if (current.parentId === ancestorFolderId) return true;
    current = allFolders.find((f) => f.id === current?.parentId);
  }
  return false;
};

/**
 * Moves a folder to a new parent folder (or to root when targetParentId is null).
 * Includes cycle detection to prevent moving a folder into itself or its own descendants.
 */
export const moveFolder = async (
  folderId: string,
  targetParentId: string | null,
  allFolders?: Folder[]
): Promise<void> => {
  if (folderId === targetParentId) {
    throw new Error("Không thể di chuyển thư mục vào chính nó.");
  }

  const list = allFolders || (await getFolders(undefined, "all"));
  if (targetParentId && isFolderDescendantOf(targetParentId, folderId, list)) {
    throw new Error("Không thể di chuyển thư mục vào bên trong thư mục con của nó.");
  }

  const docRef = doc(db, FOLDERS_COLLECTION, folderId);
  console.warn(`[Firestore] UPDATE (1 doc): ${FOLDERS_COLLECTION}/${folderId} -> parentId: ${targetParentId}`);
  await updateDoc(docRef, {
    parentId: targetParentId || null,
    updatedAt: serverTimestamp(),
  });
  FirestoreCache.invalidatePrefix("public_folders:");
  FirestoreCache.invalidate("home:public_folders");
};

/**
 * Renames a folder.
 */
export const renameFolder = async (
  folderId: string,
  newName: string
): Promise<void> => {
  const trimmed = newName.trim();
  if (!trimmed) {
    throw new Error("Tên thư mục không được để trống.");
  }
  const docRef = doc(db, FOLDERS_COLLECTION, folderId);
  console.warn(`[Firestore] UPDATE (1 doc): ${FOLDERS_COLLECTION}/${folderId} -> name: ${trimmed}`);
  await updateDoc(docRef, {
    name: trimmed,
    updatedAt: serverTimestamp(),
  });
  FirestoreCache.invalidatePrefix("public_folders:");
  FirestoreCache.invalidate("home:public_folders");
};

/**
 * Updates color tag of a folder.
 */
export const updateFolderColor = async (
  folderId: string,
  color: string
): Promise<void> => {
  const docRef = doc(db, FOLDERS_COLLECTION, folderId);
  console.warn(`[Firestore] UPDATE (1 doc): ${FOLDERS_COLLECTION}/${folderId} -> color: ${color}`);
  await updateDoc(docRef, {
    color,
    updatedAt: serverTimestamp(),
  });
};

export interface OrganizeExamsOptions {
  excludePatterns?: string[];
  excludeNames?: string[];
  excludeIds?: string[];
  ownerId?: string | null;
  targetSubject?: string;
  defaultSubject?: string;
  examIds?: string[];
}

export interface OrganizeExamsResult {
  totalRootExams: number;
  movedCount: number;
  excludedCount: number;
  foldersCreatedCount: number;
  foldersUsedCount: number;
  excludedItems: Array<{ id: string; title: string; reason?: string }>;
  foldersUsed: Array<{ id: string; name: string; examCount: number; isNew?: boolean; color?: string }>;
  movedDetails: Array<{ examId: string; examTitle: string; subject: string; folderId: string; folderName: string }>;
}

export const getSubjectFolderColor = (subject: string): string => {
  const s = subject.toLowerCase().trim();
  if (s.includes("toán") || s.includes("giải tích") || s.includes("đại số") || s.includes("hình học")) return "blue";
  if (s.includes("văn") || s.includes("ngữ văn")) return "amber";
  if (s.includes("anh") || s.includes("english")) return "indigo";
  if (s.includes("lý") || s.includes("lí") || s.includes("vật lý") || s.includes("vật lí")) return "sky";
  if (s.includes("hóa") || s.includes("hoá")) return "emerald";
  if (s.includes("sinh")) return "teal";
  if (s.includes("sử") || s.includes("lịch sử")) return "rose";
  if (s.includes("địa") || s.includes("địa lý") || s.includes("địa lí")) return "orange";
  if (s.includes("tin") || s.includes("lập trình") || s.includes("code")) return "violet";
  if (s.includes("gdcd") || s.includes("công dân")) return "yellow";
  if (s.includes("công nghệ")) return "cyan";
  return "blue";
};

/**
 * Normalizes common subject name variations and abbreviations into standard canonical subject names.
 * e.g., "Toán" -> "Toán học", "Lý" -> "Vật lý", "Hóa" -> "Hóa học", "Văn" -> "Ngữ văn", etc.
 */
export const standardizeSubject = (rawSubject: string): string => {
  if (!rawSubject || typeof rawSubject !== "string") return rawSubject;
  const s = rawSubject.trim();
  const lower = s.toLowerCase();

  // Math
  if (
    lower === "toán" ||
    lower === "toán học" ||
    lower === "toan" ||
    lower === "toan hoc" ||
    lower === "đại số" ||
    lower === "hình học" ||
    lower === "giải tích"
  ) {
    return "Toán học";
  }
  // English
  if (
    lower === "tiếng anh" ||
    lower === "anh" ||
    lower === "english" ||
    lower === "tieng anh" ||
    lower === "ngoại ngữ"
  ) {
    return "Tiếng Anh";
  }
  // Physics
  if (
    lower === "vật lý" ||
    lower === "vật lí" ||
    lower === "lý" ||
    lower === "lí" ||
    lower === "vat ly" ||
    lower === "vat li"
  ) {
    return "Vật lý";
  }
  // Chemistry
  if (
    lower === "hóa học" ||
    lower === "hoá học" ||
    lower === "hóa" ||
    lower === "hoá" ||
    lower === "hoa hoc" ||
    lower === "hoa"
  ) {
    return "Hóa học";
  }
  // Biology
  if (lower === "sinh học" || lower === "sinh" || lower === "sinh hoc") {
    return "Sinh học";
  }
  // Literature
  if (
    lower === "ngữ văn" ||
    lower === "văn học" ||
    lower === "văn" ||
    lower === "ngu van" ||
    lower === "van"
  ) {
    return "Ngữ văn";
  }
  // History
  if (lower === "lịch sử" || lower === "sử" || lower === "sử học" || lower === "lich su" || lower === "su") {
    return "Lịch sử";
  }
  // Geography
  if (lower === "địa lý" || lower === "địa lí" || lower === "địa" || lower === "dia ly" || lower === "dia li") {
    return "Địa lý";
  }
  // Informatics
  if (
    lower === "tin học" ||
    lower === "tin" ||
    lower === "tin hoc" ||
    lower === "cntt" ||
    lower === "it" ||
    lower === "lập trình"
  ) {
    return "Tin học";
  }
  // GDCD / GDKT&PL
  if (
    lower === "gdcd" ||
    lower === "công dân" ||
    lower === "giáo dục công dân" ||
    lower.includes("kinh tế & pháp luật") ||
    lower.includes("gdktepl") ||
    lower.includes("gdktpl")
  ) {
    return "GDCD";
  }
  // Technology
  if (lower === "công nghệ" || lower === "cong nghe") {
    return "Công nghệ";
  }
  // Natural / Social Sciences
  if (lower === "khtn" || lower.includes("khoa học tự nhiên")) {
    return "KHTN";
  }
  if (lower === "khxh" || lower.includes("khoa học xã hội")) {
    return "KHXH";
  }

  return s;
};

export const detectExamSubject = (
  exam: { subject?: string; title?: string },
  defaultSubject = "Chưa phân loại"
): string => {
  // If subject is explicitly set and meaningful (not 'khác', 'chưa phân loại', or 'other')
  if (exam.subject && exam.subject.trim()) {
    const rawSub = exam.subject.trim();
    const rawLower = rawSub.toLowerCase();
    if (rawLower !== "khác" && rawLower !== "chưa phân loại" && rawLower !== "other") {
      return standardizeSubject(rawSub);
    }
  }

  const title = exam.title || "";
  const titleLower = title.toLowerCase();

  // 1. Math
  if (
    /(?:^|[^\p{L}])(?:toán\s+học|toán|đại\s+số|hình\s+học|giải\s+tích)(?:[^\p{L}]|$)/iu.test(title) ||
    titleLower.includes("toán-học") ||
    titleLower.includes("toán_học")
  ) {
    if (!titleLower.includes("thuật toán")) {
      return "Toán học";
    }
  }

  // 2. English
  if (
    /(?:^|[^\p{L}])(?:tiếng\s+anh|english|anh\s+\d+|môn\s+anh|ngoại\s+ngữ)(?:[^\p{L}]|$)/iu.test(title) ||
    titleLower.includes("tiếng-anh") ||
    titleLower.includes("tiếng_anh")
  ) {
    return "Tiếng Anh";
  }

  // 3. Physics (avoids false positives on 'xử lý', 'hợp lý', 'quản lý')
  if (
    /(?:^|[^\p{L}])(?:vật\s+l[ýí]|l[ýí]\s+\d+|môn\s+l[ýí])(?:[^\p{L}]|$)/iu.test(title) ||
    titleLower.includes("vật-lý") ||
    titleLower.includes("vật_lý") ||
    titleLower.includes("vật-lí")
  ) {
    return "Vật lý";
  }

  // 4. Chemistry (avoids false positives on 'tiến hóa', 'chuyển hóa')
  if (
    /(?:^|[^\p{L}])(?:hóa\s+học|hoá\s+học|(?:đề\s+thi|kiểm\s+tra|khảo\s+sát|ôn\s+tập|bài\s+tập|môn)\s+(?:hóa|hoá)|(?:hóa|hoá)\s+\d+)(?:[^\p{L}]|$)/iu.test(title) ||
    titleLower.includes("hóa-học") ||
    titleLower.includes("hoá-học")
  ) {
    return "Hóa học";
  }

  // 5. Biology (avoids false positives on 'học sinh')
  if (
    /(?:^|[^\p{L}])(?:sinh\s+học|(?:đề\s+thi|kiểm\s+tra|khảo\s+sát|ôn\s+tập|bài\s+tập|môn)\s+sinh|sinh\s+\d+)(?:[^\p{L}]|$)/iu.test(title) ||
    titleLower.includes("sinh-học") ||
    titleLower.includes("sinh_học")
  ) {
    return "Sinh học";
  }

  // 6. Literature (avoids false positives on 'văn bản')
  if (
    /(?:^|[^\p{L}])(?:ngữ\s+văn|văn\s+học|(?:đề\s+thi|kiểm\s+tra|khảo\s+sát|ôn\s+tập|bài\s+tập|môn)\s+văn|văn\s+\d+)(?:[^\p{L}]|$)/iu.test(title) ||
    titleLower.includes("ngữ-văn") ||
    titleLower.includes("ngữ_văn")
  ) {
    return "Ngữ văn";
  }

  // 7. History (avoids false positives on 'sử dụng')
  if (
    /(?:^|[^\p{L}])(?:lịch\s+sử|sử\s+học|(?:đề\s+thi|kiểm\s+tra|khảo\s+sát|ôn\s+tập|bài\s+tập|môn)\s+sử|sử\s+\d+)(?:[^\p{L}]|$)/iu.test(title) ||
    titleLower.includes("lịch-sử") ||
    titleLower.includes("lịch_sử")
  ) {
    return "Lịch sử";
  }

  // 8. Geography (avoids false positives on 'địa chỉ', 'địa bàn')
  if (
    /(?:^|[^\p{L}])(?:địa\s+l[ýí]|(?:đề\s+thi|kiểm\s+tra|khảo\s+sát|ôn\s+tập|bài\s+tập|môn)\s+địa|địa\s+\d+)(?:[^\p{L}]|$)/iu.test(title) ||
    titleLower.includes("địa-lý") ||
    titleLower.includes("địa_lí")
  ) {
    return "Địa lý";
  }

  // 9. Informatics / IT (avoids false positives on 'thông tin')
  if (
    /(?:^|[^\p{L}])(?:tin\s+học|lập\s+trình|code|cntt|thuật\s+toán|(?:đề\s+thi|kiểm\s+tra|khảo\s+sát|ôn\s+tập|bài\s+tập|môn)\s+tin|(?<!thông\s+)tin\s+\d+)(?:[^\p{L}]|$)/iu.test(title) ||
    titleLower.includes("tin-học") ||
    titleLower.includes("thuật toán")
  ) {
    return "Tin học";
  }

  // 10. GDCD
  if (
    /(?:^|[^\p{L}])(?:gdcd|công\s+dân|kinh\s+tế\s*(&|\+|và)?\s*pháp\s+luật|gdkte?pl)(?:[^\p{L}]|$)/iu.test(title)
  ) {
    return "GDCD";
  }

  // 11. Technology
  if (/(?:^|[^\p{L}])(?:công\s+nghệ)(?:[^\p{L}]|$)/iu.test(title)) {
    return "Công nghệ";
  }

  // 12. KHTN / KHXH
  if (/(?:^|[^\p{L}])(?:khtn|khoa\s+học\s+tự\s+nhiên)(?:[^\p{L}]|$)/iu.test(title)) {
    return "KHTN";
  }
  if (/(?:^|[^\p{L}])(?:khxh|khoa\s+học\s+xã\s+hội)(?:[^\p{L}]|$)/iu.test(title)) {
    return "KHXH";
  }

  if (exam.subject && exam.subject.trim()) {
    return standardizeSubject(exam.subject.trim());
  }

  return defaultSubject;
};

/**
 * Normalizes a string by stripping Vietnamese accents and non-alphanumeric punctuation.
 * Helps match items like "json mau" <-> "json mẫu" or "TEST_WALLET" <-> "teswallet".
 */
export const normalizeMatchString = (str: string): string => {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
};

/**
 * Checks whether an exam title, code, or ID matches an exclusion pattern,
 * supporting direct substrings, diacritic-insensitive matching, and common typographical variations.
 */
export const isExamMatchingPattern = (
  exam: { id?: string; title?: string; code?: string },
  pattern: string
): boolean => {
  if (!pattern) return false;
  const rawP = pattern.trim().toLowerCase();
  if (!rawP) return false;

  const titleLower = (exam.title || "").toLowerCase();
  const codeLower = (exam.code || "").toLowerCase();
  const idLower = (exam.id || "").toLowerCase();

  // 1. Direct raw substring match
  if (titleLower.includes(rawP) || codeLower.includes(rawP) || idLower.includes(rawP)) {
    return true;
  }

  // 2. Normalized stripped match (accent-less and punctuation-free)
  const normPat = normalizeMatchString(rawP);
  if (normPat.length >= 2) {
    const normTitle = normalizeMatchString(titleLower);
    const normCode = normalizeMatchString(codeLower);
    const normId = normalizeMatchString(idLower);

    if (normTitle.includes(normPat) || normCode.includes(normPat) || normId.includes(normPat)) {
      return true;
    }

    // 3. Typo handling for common variations (e.g. teswallet <-> testwallet)
    if (normPat === "teswallet" || normPat === "testwallet") {
      if (
        normTitle.includes("teswallet") ||
        normTitle.includes("testwallet") ||
        normCode.includes("teswallet") ||
        normCode.includes("testwallet")
      ) {
        return true;
      }
    }
  }

  // 4. Multi-token keywords check: e.g. "json mẫu" -> both "json" and "mẫu" (or "mau") present
  const tokens = rawP
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  if (tokens.length >= 2) {
    const allTokensMatch = tokens.every((token) => {
      const normTok = normalizeMatchString(token);
      return (
        titleLower.includes(token) ||
        codeLower.includes(token) ||
        normalizeMatchString(titleLower).includes(normTok) ||
        normalizeMatchString(codeLower).includes(normTok)
      );
    });
    if (allTokensMatch) return true;
  }

  return false;
};

/**
 * Extracts exclusion patterns from natural language prompts or action labels/texts,
 * preserving multi-word phrases (e.g. "json mẫu", "teswallet").
 */
export const extractExcludePatternsFromText = (text: string): string[] => {
  if (!text) return [];
  const match = text.match(
    /(?:trừ|ngoại\s+trừ|loại\s+trừ|bỏ\s+qua|không\s+bao\s+gồm|không\s+chuyển)\s+([^().\n;!?]+?)(?:\)|vô|vào|sang|đến|theo|$)/i
  );
  if (!match || !match[1]) return [];

  const rawTokens = match[1].split(/(?:\s*[,;]+\s*|\s+(?:và|va|and|or|hoặc|cùng|\+)\s+)/i);
  return rawTokens
    .map((t) => {
      let cleaned = t.trim().replace(/^[\s(\["'“”‘’]+|[\s)\]"'“”‘’]+$/g, "");
      let prev = "";
      while (cleaned !== prev) {
        prev = cleaned;
        cleaned = cleaned.replace(/^(?:các|những|bài\s+thi|đề\s+thi|bài|đề)\s+/i, "").trim();
      }
      return cleaned;
    })
    .filter(
      (t) =>
        t.length > 1 &&
        !["các", "những", "bài", "thi", "đề", "folder", "thư mục", "chuyên môn", "riêng"].includes(
          t.toLowerCase()
        )
    );
};

/**
 * Organizes unorganized exams sitting outside folders (drive root) into respective subject folders.
 * Finds or creates folders for each subject, and bulk updates exams into their respective folders.
 */
export const organizeExamsIntoFolders = async (
  options: OrganizeExamsOptions = {}
): Promise<OrganizeExamsResult> => {
  // 1. Fetch all existing folders
  const allFolders = await getFolders(options.ownerId || null, "all");
  const existingFolderByName = new Map<string, Folder>();
  allFolders.forEach((f) => {
    const norm = f.name.trim().toLowerCase();
    // Prioritize root folders (parentId == null) if multiple exist with same name
    if (!existingFolderByName.has(norm) || !f.parentId) {
      existingFolderByName.set(norm, f);
    }
  });

  // 2. Fetch all exams from Firestore
  const examsSnap = await getDocs(collection(db, EXAMS_COLLECTION));
  console.warn(`[Firestore] READ_MANY (${examsSnap.size} docs): ${EXAMS_COLLECTION} (organize exams)`);

  const rawExams: Exam[] = examsSnap.docs.map(
    (d) => ({ id: d.id, ...(d.data() as any) } as Exam)
  );

  // Filter root exams: where folderId is null, undefined, empty string "", or "root"
  const rootExams = rawExams.filter((ex) => {
    if (options.ownerId && ex.ownerId && ex.ownerId !== options.ownerId) return false;
    if (options.examIds && options.examIds.length > 0 && !options.examIds.includes(ex.id)) {
      return false;
    }
    return !ex.folderId || ex.folderId === "root" || ex.folderId === "";
  });

  const totalRootExams = rootExams.length;

  // 3. Build exclude patterns
  const rawExcludes: string[] = [
    ...(options.excludePatterns || []),
    ...(options.excludeNames || []),
    ...(options.excludeIds || []),
  ];
  const normalizedExcludes = rawExcludes
    .map((p) => p.trim())
    .filter(Boolean);

  const excludedItems: Array<{ id: string; title: string; reason?: string }> = [];
  const candidateExams: Exam[] = [];

  for (const ex of rootExams) {
    const matchedPattern = normalizedExcludes.find((pat) => isExamMatchingPattern(ex, pat));

    if (matchedPattern) {
      excludedItems.push({
        id: ex.id,
        title: ex.title || ex.id,
        reason: `Khớp mẫu loại trừ: "${matchedPattern}"`,
      });
    } else {
      candidateExams.push(ex);
    }
  }

  // 4. Group candidate exams by detected subject
  const subjectGroups = new Map<string, Exam[]>();
  for (const ex of candidateExams) {
    const subject = detectExamSubject(ex, options.defaultSubject || "Chưa phân loại");
    if (options.targetSubject) {
      const normTarget = options.targetSubject.trim().toLowerCase();
      const stdTarget = standardizeSubject(options.targetSubject).toLowerCase();
      const normSubject = subject.toLowerCase();
      const stdSubject = standardizeSubject(subject).toLowerCase();

      if (
        normSubject !== normTarget &&
        stdSubject !== stdTarget &&
        !normSubject.includes(normTarget) &&
        !normTarget.includes(normSubject)
      ) {
        continue;
      }
    }
    const currentList = subjectGroups.get(subject) || [];
    currentList.push(ex);
    subjectGroups.set(subject, currentList);
  }

  // 5. For each subject, find or create folder, and update exams
  let foldersCreatedCount = 0;
  const foldersUsed: Array<{ id: string; name: string; examCount: number; isNew?: boolean; color?: string }> = [];
  const movedDetails: Array<{ examId: string; examTitle: string; subject: string; folderId: string; folderName: string }> = [];
  let movedCount = 0;

  for (const [subjectName, examsInSubject] of subjectGroups.entries()) {
    if (examsInSubject.length === 0) continue;

    const normSubject = subjectName.trim().toLowerCase();
    const stdSubject = standardizeSubject(subjectName).toLowerCase();
    let targetFolder = existingFolderByName.get(normSubject) || existingFolderByName.get(stdSubject);

    // If not exact match, look for canonical or contains match among root folders
    if (!targetFolder) {
      targetFolder = allFolders.find((f) => {
        if (f.parentId) return false;
        const normF = f.name.trim().toLowerCase();
        const stdF = standardizeSubject(f.name).toLowerCase();
        if (normF === normSubject || stdF === stdSubject) return true;
        if (normSubject.startsWith(normF) || stdSubject === stdF) return true;
        return false;
      });
    }

    let isNew = false;
    let targetFolderId = "";
    let targetFolderName = subjectName;

    if (!targetFolder) {
      // Create new folder for this subject
      const folderColor = getSubjectFolderColor(subjectName);
      const newFolder = await createFolder({
        name: subjectName,
        parentId: null,
        color: folderColor,
        description: `Thư mục chuyên môn môn ${subjectName}`,
        isPublic: false,
        ownerId: options.ownerId || null,
      });
      targetFolderId = newFolder.id;
      targetFolderName = newFolder.name;
      isNew = true;
      foldersCreatedCount++;
      // Cache in local map for potential further use in same run
      existingFolderByName.set(normSubject, newFolder);
      existingFolderByName.set(stdSubject, newFolder);
      allFolders.push(newFolder);
    } else {
      targetFolderId = targetFolder.id;
      targetFolderName = targetFolder.name;
    }

    // Move exams into this folder in chunks
    const examIds = examsInSubject.map((e) => e.id);
    const CHUNK_SIZE = 400; // Safe below Firestore's 500 limit
    for (let i = 0; i < examIds.length; i += CHUNK_SIZE) {
      const chunk = examIds.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((id) => {
        const docRef = doc(db, EXAMS_COLLECTION, id);
        batch.update(docRef, {
          folderId: targetFolderId,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    }

    movedCount += examIds.length;

    foldersUsed.push({
      id: targetFolderId,
      name: targetFolderName,
      examCount: examIds.length,
      isNew,
      color: targetFolder?.color || getSubjectFolderColor(subjectName),
    });

    examsInSubject.forEach((e) => {
      movedDetails.push({
        examId: e.id,
        examTitle: e.title || e.id,
        subject: subjectName,
        folderId: targetFolderId,
        folderName: targetFolderName,
      });
    });
  }

  // 6. Invalidate caches
  FirestoreCache.invalidatePrefix("query:exams");
  FirestoreCache.invalidatePrefix("doc:exams");
  FirestoreCache.invalidate("doc:system_stats:exams_summary");
  FirestoreCache.invalidatePrefix("public_folders:");
  FirestoreCache.invalidate("home:public_folders");

  return {
    totalRootExams,
    movedCount,
    excludedCount: excludedItems.length,
    foldersCreatedCount,
    foldersUsedCount: foldersUsed.length,
    excludedItems,
    foldersUsed,
    movedDetails,
  };
};

