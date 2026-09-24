import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  limit,
  startAfter,
  orderBy,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase/config";
import type { Student, PaginatedResult } from "../types";

const STUDENTS_COLLECTION = "students";

export const saveStudentProfile = async (profile: {
  uid?: string;
  name: string;
  email?: string;
  username?: string;
  avatarUrl?: string;
  studentClass?: string;
}) => {
  if (!profile.name) return;
  const docId = profile.username || profile.name.replace(/\s+/g, "_").toLowerCase();
  const docRef = doc(db, STUDENTS_COLLECTION, docId);
  console.warn(`[Firestore] WRITE (1 doc): ${STUDENTS_COLLECTION}/${docId}`);
  const payload: Record<string, any> = {
    name: profile.name,
    email: profile.email || "",
    username: profile.username || "",
    avatarUrl: profile.avatarUrl || "",
    studentClass: profile.studentClass || "",
    searchNameLower: profile.name.toLowerCase(),
    lastActive: serverTimestamp(),
    createdAt: serverTimestamp(),
  };
  if (profile.uid) {
    payload.uid = profile.uid;
  }
  await setDoc(docRef, payload, { merge: true });
};

export const updateStudent = async (studentId: string, data: Partial<Student>) => {
  const docRef = doc(db, STUDENTS_COLLECTION, studentId);
  console.warn(`[Firestore] UPDATE (1 doc): ${STUDENTS_COLLECTION}/${studentId}`);
  await updateDoc(docRef, {
    ...data,
    ...(data.name ? { searchNameLower: data.name.toLowerCase() } : {})
  });
};

export const deleteStudent = async (studentId: string) => {
  try {
    const docRef = doc(db, STUDENTS_COLLECTION, studentId);
    const studentSnap = await getDoc(docRef);
    console.warn(`[Firestore] READ (1 doc): ${STUDENTS_COLLECTION}/${studentId} (found: ${studentSnap.exists()}, for cascade delete)`);
    let username = "";
    let name = "";
    if (studentSnap.exists()) {
      const data = studentSnap.data();
      username = data.username || "";
      name = data.name || "";
    }

    // 1. Delete student doc
    console.warn(`[Firestore] DELETE (1 doc): ${STUDENTS_COLLECTION}/${studentId}`);
    await deleteDoc(docRef);

    // 2. Cascade delete all submissions of this student
    const subsRef = collection(db, "submissions");
    const queries = [
      query(subsRef, where("studentId", "==", studentId)),
      ...(username ? [query(subsRef, where("studentUsername", "==", username))] : []),
      ...(name ? [query(subsRef, where("studentNameSnapshot", "==", name))] : []),
    ];

    const deletedSubIds = new Set<string>();
    for (const q of queries) {
      try {
        const snap = await getDocs(q);
        console.warn(`[Firestore] READ_MANY (${snap.size} docs): submissions (for student cascade deletion)`);
        if (!snap.empty) {
          console.warn(`[Firestore] DELETE_BATCH (${snap.size} docs): submissions`);
          const batch = writeBatch(db);
          snap.docs.forEach((d) => {
            if (!deletedSubIds.has(d.id)) {
              deletedSubIds.add(d.id);
              batch.delete(d.ref);
            }
          });
          await batch.commit();
        }
      } catch (err) {
        console.warn("Could not delete some submissions for student:", err);
      }
    }

    // 3. Cascade delete active sessions of this student
    try {
      const sessRef = collection(db, "active_sessions");
      const targetUsernames = [username, studentId].filter(Boolean);
      for (const u of targetUsernames) {
        const sessSnap = await getDocs(query(sessRef, where("studentUsername", "==", u)));
        console.warn(`[Firestore] READ_MANY (${sessSnap.size} docs): active_sessions (for student cascade deletion)`);
        if (!sessSnap.empty) {
          console.warn(`[Firestore] DELETE_BATCH (${sessSnap.size} docs): active_sessions`);
          const sessBatch = writeBatch(db);
          sessSnap.docs.forEach((d) => sessBatch.delete(d.ref));
          await sessBatch.commit();
        }
      }
    } catch (sessErr) {
      console.warn("Could not cascade delete active_sessions:", sessErr);
    }
  } catch (err) {
    console.error("Error in cascade deleteStudent:", err);
    throw err;
  }
};

export const getStudentList = async ({
  pageSize = 30,
  cursor = null,
  searchQuery = "",
}: {
  pageSize?: number;
  cursor?: any;
  searchQuery?: string;
}): Promise<PaginatedResult<Student>> => {
  try {
    let q = collection(db, STUDENTS_COLLECTION) as any;

    if (searchQuery) {
      q = query(
        q,
        where("searchNameLower", ">=", searchQuery.toLowerCase()),
        where("searchNameLower", "<=", searchQuery.toLowerCase() + "\uf8ff"),
        limit(pageSize)
      );
    } else {
      q = query(q, limit(pageSize));
    }

    if (cursor) {
      q = query(q, startAfter(cursor));
    }

    const snapshot = await getDocs(q);
    console.warn(`[Firestore] READ_MANY (${snapshot.size} docs): ${STUDENTS_COLLECTION} (searchQuery: "${searchQuery}")`);
    let items = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as object) } as Student));

    // Fallback/enrich from submissions collection if students collection is empty or sparse
    if (items.length === 0) {
      const subSnap = await getDocs(query(collection(db, "submissions"), limit(100)));
      console.warn(`[Firestore] READ_MANY (${subSnap.size} docs): submissions (fallback for empty student list)`);
      const studentMap = new Map<string, Student>();

      subSnap.docs.forEach((doc) => {
        const data = doc.data();
        const name = data.studentNameSnapshot || data.studentId || "Thí sinh";
        if (!studentMap.has(name)) {
          studentMap.set(name, {
            id: doc.id,
            name: name,
            email: "",
            createdAt: data.submittedAt,
          } as Student);
        }
      });

      let subStudents = Array.from(studentMap.values());
      if (searchQuery) {
        subStudents = subStudents.filter((s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      items = subStudents.slice(0, pageSize);
    }

    const nextCursor = snapshot.docs[snapshot.docs.length - 1] || null;

    return {
      items,
      nextCursor,
      hasMore: snapshot.docs.length === pageSize,
    };
  } catch (err) {
    console.error("Error in getStudentList:", err);
    return { items: [], nextCursor: null, hasMore: false };
  }
};

export const getStudent = async (studentId: string): Promise<Student | null> => {
  const docRef = doc(db, STUDENTS_COLLECTION, studentId);
  const snapshot = await getDoc(docRef);
  console.warn(`[Firestore] READ (1 doc): ${STUDENTS_COLLECTION}/${studentId} (found: ${snapshot.exists()})`);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...(snapshot.data() as any) } as Student;
  }
  return null;
};
