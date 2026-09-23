import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "./firebase/config";
import type { ParentStudentRelationship } from "../types";

const REL_COLLECTION = "relationships";

/**
 * Generate a random 6-character link code (e.g., DK-7392)
 */
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "DK-";
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Student creates an invitation code for a parent
 */
export async function createStudentInviteCode(
  studentUid: string,
  studentName: string,
  studentEmail = "",
  studentClass = ""
): Promise<string> {
  const code = generateCode();
  const relRef = doc(collection(db, REL_COLLECTION));

  const relData: ParentStudentRelationship = {
    id: relRef.id,
    studentUid,
    studentName,
    studentEmail,
    studentClass,
    parentUid: "",
    parentName: "",
    inviteCode: code,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  await setDoc(relRef, relData);
  return code;
}

/**
 * Parent inputs invitation code to link with student
 */
export async function claimInviteCode(
  inviteCode: string,
  parentUid: string,
  parentName: string,
  parentEmail = ""
): Promise<{ success: boolean; message: string; relationship?: ParentStudentRelationship }> {
  try {
    const cleanCode = inviteCode.trim().toUpperCase();
    const q = query(
      collection(db, REL_COLLECTION),
      where("inviteCode", "==", cleanCode),
      where("status", "==", "pending")
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      return {
        success: false,
        message: "Mã liên kết không hợp lệ hoặc đã được sử dụng. Vui lòng kiểm tra lại với học sinh.",
      };
    }

    const relDoc = snap.docs[0];
    const relData = relDoc.data() as ParentStudentRelationship;

    if (relData.studentUid === parentUid) {
      return {
        success: false,
        message: "Không thể tự liên kết với chính tài khoản của bạn.",
      };
    }

    const now = new Date().toISOString();

    // Update relationship to active
    await updateDoc(relDoc.ref, {
      parentUid,
      parentName,
      parentEmail,
      status: "active",
      linkedAt: now,
      updatedAt: now,
    });

    // Add parentUid to student's parentIds in students collection
    try {
      await updateDoc(doc(db, "students", relData.studentUid), {
        parentIds: arrayUnion(parentUid),
      });
    } catch (e) {}

    // Add studentUid to parent's childIds in parents collection
    try {
      await updateDoc(doc(db, "parents", parentUid), {
        childIds: arrayUnion(relData.studentUid),
      });
    } catch (e) {}

    return {
      success: true,
      message: `Đã liên kết thành công với học sinh ${relData.studentName}!`,
      relationship: {
        ...relData,
        parentUid,
        parentName,
        parentEmail,
        status: "active",
        linkedAt: now,
      },
    };
  } catch (err: any) {
    console.error("[relationshipService] claimInviteCode error:", err);
    return {
      success: false,
      message: err.message || "Lỗi khi xử lý mã liên kết.",
    };
  }
}

/**
 * Get active relationships for student
 */
export async function getStudentRelationships(studentUid: string): Promise<ParentStudentRelationship[]> {
  try {
    const q = query(
      collection(db, REL_COLLECTION),
      where("studentUid", "==", studentUid)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ParentStudentRelationship));
  } catch (err) {
    console.error("[relationshipService] getStudentRelationships error:", err);
    return [];
  }
}

/**
 * Get active relationships for parent
 */
export async function getParentRelationships(parentUid: string): Promise<ParentStudentRelationship[]> {
  try {
    const q = query(
      collection(db, REL_COLLECTION),
      where("parentUid", "==", parentUid),
      where("status", "==", "active")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ParentStudentRelationship));
  } catch (err) {
    console.error("[relationshipService] getParentRelationships error:", err);
    return [];
  }
}

/**
 * Unlink parent and student
 */
export async function unlinkRelationship(relationshipId: string): Promise<boolean> {
  try {
    const relRef = doc(db, REL_COLLECTION, relationshipId);
    const snap = await getDoc(relRef);
    if (!snap.exists()) return false;

    const data = snap.data() as ParentStudentRelationship;
    await updateDoc(relRef, {
      status: "unlinked",
      updatedAt: new Date().toISOString(),
    });

    if (data.studentUid && data.parentUid) {
      try {
        await updateDoc(doc(db, "students", data.studentUid), {
          parentIds: arrayRemove(data.parentUid),
        });
      } catch (e) {}
      try {
        await updateDoc(doc(db, "parents", data.parentUid), {
          childIds: arrayRemove(data.studentUid),
        });
      } catch (e) {}
    }

    return true;
  } catch (err) {
    console.error("[relationshipService] unlinkRelationship error:", err);
    return false;
  }
}
