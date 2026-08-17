// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

/**
 * Cloud Function để lưu đề thi
 * KHÔNG bị Firestore Rules chặn vì dùng Admin SDK
 */
exports.saveExam = functions.https.onCall(async (data, context) => {
  // Kiểm tra xác thực
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Cần đăng nhập để lưu đề.",
    );
  }

  // Kiểm tra quyền Admin (nếu muốn)
  const isAdmin = context.auth.token.admin === true;
  if (!isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Chỉ Admin mới được lưu đề.",
    );
  }

  const db = admin.firestore();
  const batch = db.batch();

  // Tạo document mới
  const examRef = db.collection("KhoDeThi").doc();
  const examId = examRef.id;

  // 1. Metadata
  const metadata = {
    ...data.metadata,
    id: examId,
    contentRef: examId,
    ngayTao: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: context.auth.uid,
    createdByEmail: context.auth.token.email,
  };
  batch.set(examRef, metadata);

  // 2. Nội dung câu hỏi
  batch.set(db.collection("NoiDungDeThi").doc(examId), {
    ...data.content,
    examId: examId,
    capNhat: admin.firestore.FieldValue.serverTimestamp(),
  });

  // 3. Đáp án bảo mật
  batch.set(db.collection("DapAnDeThi").doc(examId), {
    ...data.answers,
    examId: examId,
    capNhat: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    id: examId,
    message: `Đề "${data.metadata.title || "Không tên"}" đã được lưu thành công!`,
  };
});

/**
 * Cloud Function để lưu đề (phiên bản HTTP)
 */
exports.saveExamHttp = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    // Kiểm tra token
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) {
      res.status(401).json({ error: "Chưa đăng nhập" });
      return;
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    if (!decodedToken.admin) {
      res.status(403).json({ error: "Không có quyền Admin" });
      return;
    }

    const data = req.body;
    const db = admin.firestore();
    const batch = db.batch();

    const examRef = db.collection("KhoDeThi").doc();
    const examId = examRef.id;

    batch.set(examRef, {
      ...data.metadata,
      id: examId,
      contentRef: examId,
      ngayTao: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: decodedToken.uid,
      createdByEmail: decodedToken.email,
    });

    batch.set(db.collection("NoiDungDeThi").doc(examId), {
      ...data.content,
      examId: examId,
      capNhat: admin.firestore.FieldValue.serverTimestamp(),
    });

    batch.set(db.collection("DapAnDeThi").doc(examId), {
      ...data.answers,
      examId: examId,
      capNhat: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
    res.json({ success: true, id: examId });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});
