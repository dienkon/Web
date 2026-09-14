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
import { Folder } from "../types";
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
