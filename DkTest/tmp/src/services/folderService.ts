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

export const getFolders = async (
  ownerId?: string | null,
): Promise<Folder[]> => {
  try {
    let q = collection(db, FOLDERS_COLLECTION) as any;
    if (ownerId) {
      q = query(q, where("ownerId", "==", ownerId));
    }
    console.log(`[Firestore] READ_MANY: ${FOLDERS_COLLECTION}`);
    const snap = await getDocs(q);
    const folders = snap.docs.map(
      (d) => ({ id: d.id, ...(d.data() as any) }) as Folder,
    );

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

export const createFolder = async (
  folderData: Omit<Folder, "id" | "createdAt" | "updatedAt">,
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

  console.log(`[Firestore] WRITE: ${FOLDERS_COLLECTION}/${docRef.id}`, payload);
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
  updates: Partial<Folder>,
): Promise<void> => {
  const docRef = doc(db, FOLDERS_COLLECTION, folderId);
  console.log(`[Firestore] UPDATE: ${FOLDERS_COLLECTION}/${folderId}`);
  const payload = sanitizePayload({
    ...updates,
    updatedAt: serverTimestamp(),
  });
  await updateDoc(docRef, payload);
};

export const deleteFolder = async (
  folderId: string,
  moveExamsToParent: boolean = true,
): Promise<void> => {
  // Get folder details to find parent
  const folderDoc = await getDoc(doc(db, FOLDERS_COLLECTION, folderId));
  const parentId = folderDoc.exists()
    ? folderDoc.data()?.parentId || null
    : null;

  // Move subfolders to parent folder
  const subfoldersQuery = query(
    collection(db, FOLDERS_COLLECTION),
    where("parentId", "==", folderId),
  );
  const subfoldersSnap = await getDocs(subfoldersQuery);
  if (!subfoldersSnap.empty) {
    const batch = writeBatch(db);
    subfoldersSnap.docs.forEach((docItem) => {
      batch.update(docItem.ref, {
        parentId: parentId,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }

  // Move exams inside folder to parent or root
  if (moveExamsToParent) {
    const q = query(
      collection(db, EXAMS_COLLECTION),
      where("folderId", "==", folderId),
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.docs.forEach((docItem) => {
        batch.update(docItem.ref, {
          folderId: parentId,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    }
  }

  const docRef = doc(db, FOLDERS_COLLECTION, folderId);
  console.log(`[Firestore] DELETE: ${FOLDERS_COLLECTION}/${folderId}`);
  await deleteDoc(docRef);
};

export const moveExamToFolder = async (
  examId: string,
  folderId: string | null,
): Promise<void> => {
  const docRef = doc(db, EXAMS_COLLECTION, examId);
  console.log(
    `[Firestore] UPDATE_EXAM_FOLDER: ${EXAMS_COLLECTION}/${examId} -> ${folderId}`,
  );
  await updateDoc(docRef, {
    folderId: folderId || null,
    updatedAt: serverTimestamp(),
  });
};

export const bulkMoveExamsToFolder = async (
  examIds: string[],
  folderId: string | null,
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
  console.log(
    `[Firestore] BULK_UPDATE_EXAM_FOLDER: ${examIds.length} items -> ${folderId}`,
  );
  await batch.commit();
};

export const bulkDeleteExams = async (examIds: string[]): Promise<void> => {
  for (const id of examIds) {
    await deleteExam(id);
  }
};

export const toggleExamFeatured = async (
  examId: string,
  isFeatured: boolean,
): Promise<void> => {
  const docRef = doc(db, EXAMS_COLLECTION, examId);
  await updateDoc(docRef, {
    isFeatured: isFeatured,
    updatedAt: serverTimestamp(),
  });
};
