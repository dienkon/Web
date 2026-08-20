import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase/config";
import type { Submission } from "../types";

export interface ParentLinkRequest {
  id: string;
  parentUsername: string;
  parentDisplayName: string;
  childUsername: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export interface LinkedChildInfo {
  username: string;
  displayName: string;
  avatarUrl?: string;
  studentClass?: string;
  recentSubmissions?: Submission[];
  activeSession?: any;
}

/**
 * Send a connection request from parent to child
 */
export async function sendParentLinkRequest(
  parentUsername: string,
  parentDisplayName: string,
  childUsername: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const cleanChild = childUsername.trim().toLowerCase();
    const cleanParent = parentUsername.trim().toLowerCase();

    // 1. Check if child user exists
    const childRef = doc(db, "users", cleanChild);
    const childSnap = await getDoc(childRef);
    if (!childSnap.exists()) {
      return {
        success: false,
        message: `Không tìm thấy tài khoản học sinh "${cleanChild}". Vui lòng kiểm tra lại username của con.`,
      };
    }

    // 2. Check if a request already exists
    const q = query(
      collection(db, "parent_link_requests"),
      where("parentUsername", "==", cleanParent),
      where("childUsername", "==", cleanChild),
    );
    const existingSnap = await getDocs(q);
    if (!existingSnap.empty) {
      const existingData = existingSnap.docs[0].data();
      if (existingData.status === "accepted") {
        return {
          success: false,
          message: "Tài khoản của bạn đã được liên kết với học sinh này rồi.",
        };
      }
      if (existingData.status === "pending") {
        return {
          success: false,
          message:
            "Yêu cầu liên kết đã được gửi trước đó và đang chờ học sinh xác nhận.",
        };
      }
    }

    // 3. Create request doc
    const newDocRef = doc(collection(db, "parent_link_requests"));
    await setDoc(newDocRef, {
      id: newDocRef.id,
      parentUsername: cleanParent,
      parentDisplayName: parentDisplayName || cleanParent,
      childUsername: cleanChild,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: `Đã gửi yêu cầu liên kết tới học sinh "${cleanChild}". Khi con nhấn đồng ý, bạn sẽ có thể giám sát kết quả thi.`,
    };
  } catch (err: any) {
    console.error("Error sending parent link request:", err);
    return {
      success: false,
      message: err.message || "Lỗi khi gửi yêu cầu liên kết.",
    };
  }
}

/**
 * Get all connection requests for a student
 */
export async function getPendingRequestsForStudent(
  childUsername: string,
): Promise<ParentLinkRequest[]> {
  try {
    const cleanChild = childUsername.trim().toLowerCase();
    const q = query(
      collection(db, "parent_link_requests"),
      where("childUsername", "==", cleanChild),
      where("status", "==", "pending"),
    );
    const snap = await getDocs(q);
    return snap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as ParentLinkRequest,
    );
  } catch (err) {
    console.error("Error fetching pending requests for student:", err);
    return [];
  }
}

/**
 * Respond to a link request (student accepts or rejects)
 */
export async function respondToParentLinkRequest(
  requestId: string,
  accept: boolean,
): Promise<boolean> {
  try {
    const docRef = doc(db, "parent_link_requests", requestId);
    await updateDoc(docRef, {
      status: accept ? "accepted" : "rejected",
      respondedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.error("Error responding to parent link request:", err);
    return false;
  }
}

/**
 * Get all linked children for a parent
 */
export async function getLinkedChildrenForParent(
  parentUsername: string,
): Promise<LinkedChildInfo[]> {
  try {
    const cleanParent = parentUsername.trim().toLowerCase();
    const q = query(
      collection(db, "parent_link_requests"),
      where("parentUsername", "==", cleanParent),
      where("status", "==", "accepted"),
    );
    const snap = await getDocs(q);
    const requests = snap.docs.map((d) => d.data() as ParentLinkRequest);

    const children: LinkedChildInfo[] = [];

    for (const req of requests) {
      const childUserDoc = await getDoc(doc(db, "users", req.childUsername));
      let childName = req.childUsername;
      let avatarUrl = "";
      let studentClass = "";

      if (childUserDoc.exists()) {
        const udata = childUserDoc.data();
        childName = udata.displayName || childName;
        avatarUrl = udata.avatarUrl || "";
        studentClass = udata.studentClass || "";
      }

      // Fetch student's submissions
      const subQuery = query(
        collection(db, "submissions"),
        where("studentId", "==", req.childUsername),
      );
      const subSnap = await getDocs(subQuery);
      const subs = subSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Submission,
      );

      // Sort newest first
      subs.sort((a: any, b: any) => {
        const getMs = (val: any) => {
          if (!val) return 0;
          if (typeof val.toDate === "function") return val.toDate().getTime();
          if (val instanceof Date) return val.getTime();
          return new Date(val).getTime() || 0;
        };
        return getMs(b.submittedAt) - getMs(a.submittedAt);
      });

      // Check active proctoring / taking session
      let activeSession = null;
      try {
        // Query active_sessions first
        const actQuery = query(
          collection(db, "active_sessions"),
          where("studentUsername", "==", req.childUsername),
        );
        const actSnap = await getDocs(actQuery);
        let foundDoc = null;
        if (!actSnap.empty) {
          foundDoc = actSnap.docs[0].data();
        } else {
          // Fallback query with studentId
          const actQuery2 = query(
            collection(db, "active_sessions"),
            where("studentId", "==", req.childUsername),
          );
          const actSnap2 = await getDocs(actQuery2);
          if (!actSnap2.empty) {
            foundDoc = actSnap2.docs[0].data();
          } else {
            // Check taking_sessions fallback
            const sessQuery = query(
              collection(db, "taking_sessions"),
              where("studentId", "==", req.childUsername),
            );
            const sessSnap = await getDocs(sessQuery);
            if (!sessSnap.empty) {
              foundDoc = sessSnap.docs[0].data();
            }
          }
        }

        if (foundDoc && foundDoc.status !== "submitted") {
          const lastActive =
            typeof foundDoc.lastActiveAt === "number"
              ? foundDoc.lastActiveAt
              : foundDoc.lastHeartbeat
                ? new Date(foundDoc.lastHeartbeat).getTime()
                : foundDoc.startTime
                  ? new Date(foundDoc.startTime).getTime()
                  : 0;

          const diffMin = (Date.now() - lastActive) / 60000;
          if (diffMin < 10) {
            activeSession = foundDoc;
          }
        }
      } catch (sessErr) {
        console.warn("Error querying active session for child:", sessErr);
      }

      children.push({
        username: req.childUsername,
        displayName: childName,
        avatarUrl,
        studentClass,
        recentSubmissions: subs,
        activeSession,
      });
    }

    return children;
  } catch (err) {
    console.error("Error fetching linked children for parent:", err);
    return [];
  }
}

/**
 * Get list of pending sent requests by parent
 */
export async function getPendingRequestsSentByParent(
  parentUsername: string,
): Promise<ParentLinkRequest[]> {
  try {
    const cleanParent = parentUsername.trim().toLowerCase();
    const q = query(
      collection(db, "parent_link_requests"),
      where("parentUsername", "==", cleanParent),
      where("status", "==", "pending"),
    );
    const snap = await getDocs(q);
    return snap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as ParentLinkRequest,
    );
  } catch (err) {
    console.error("Error fetching pending requests for parent:", err);
    return [];
  }
}
