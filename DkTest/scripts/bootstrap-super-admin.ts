import dotenv from "dotenv";
dotenv.config();

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth, UserRecord } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  "exam-fd7a1";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (privateKey) {
  privateKey = privateKey.replace(/\\n/g, "\n");
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
}

const isRealPrivateKey =
  privateKey &&
  !privateKey.includes("...") &&
  privateKey.includes("-----BEGIN PRIVATE KEY-----");

const existingApps = getApps();
const app = existingApps.length
  ? existingApps[0]
  : clientEmail && isRealPrivateKey
  ? initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    })
  : initializeApp({ projectId });

const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  const args = process.argv.slice(2);
  const targetEmailOrUid = args[0];
  const initialPassword = args.find((a) => a.startsWith("--password="))?.split("=")[1];

  console.log("==================================================");
  console.log("  DkTEST - Super Admin Account Bootstrap Tool    ");
  console.log("==================================================");

  if (!targetEmailOrUid) {
    console.error("\n❌ Vui lòng cung cấp Email hoặc UID của tài khoản Admin.");
    console.log("Cách sử dụng:");
    console.log("  npx tsx scripts/bootstrap-super-admin.ts <email-hoac-uid> [--password=MatKhau123]");
    console.log("\nVí dụ:");
    console.log("  npx tsx scripts/bootstrap-super-admin.ts admin@dktest.edu.vn");
    console.log("  npx tsx scripts/bootstrap-super-admin.ts admin@dktest.edu.vn --password=AdminSecure#2026\n");
    process.exit(1);
  }

  try {
    let userRecord: UserRecord;

    // Check if target is email or UID
    if (targetEmailOrUid.includes("@")) {
      console.log(`🔍 Tìm kiếm tài khoản Auth với Email: ${targetEmailOrUid}...`);
      try {
        userRecord = await auth.getUserByEmail(targetEmailOrUid);
        console.log(`✅ Đã tìm thấy tài khoản UID: ${userRecord.uid}`);
      } catch (err: any) {
        if (err.code === "auth/user-not-found") {
          if (!initialPassword) {
            console.error(`\n⚠️  Tài khoản ${targetEmailOrUid} chưa tồn tại trên Firebase Auth.`);
            console.log("Bạn có thể cung cấp thêm --password=... để tự động tạo mới tài khoản:");
            console.log(`  npx tsx scripts/bootstrap-super-admin.ts ${targetEmailOrUid} --password=MatKhauManh@123\n`);
            process.exit(1);
          }
          console.log(`✨ Đang tạo mới tài khoản Auth cho ${targetEmailOrUid}...`);
          userRecord = await auth.createUser({
            email: targetEmailOrUid,
            password: initialPassword,
            displayName: "Super Administrator",
            emailVerified: true,
          });
          console.log(`✅ Tạo tài khoản Auth thành công với UID: ${userRecord.uid}`);
        } else {
          throw err;
        }
      }
    } else {
      console.log(`🔍 Tìm kiếm tài khoản Auth với UID: ${targetEmailOrUid}...`);
      userRecord = await auth.getUser(targetEmailOrUid);
      console.log(`✅ Đã tìm thấy tài khoản Email: ${userRecord.email}`);
    }

    // 1. Set Custom Claims (role: super_admin)
    console.log("⚙️  Đang gán Custom Claims (role: super_admin, admin: true)...");
    await auth.setCustomUserClaims(userRecord.uid, {
      role: "super_admin",
      admin: true,
    });
    console.log("✅ Gán Custom Claims thành công!");

    // 2. Set Firestore user document
    console.log("💾 Đang cập nhật hồ sơ trong Firestore collection 'users'...");
    const userRef = db.collection("users").doc(userRecord.uid);
    const existingDoc = await userRef.get();

    const updatePayload: Record<string, any> = {
      uid: userRecord.uid,
      email: userRecord.email || targetEmailOrUid,
      displayName: userRecord.displayName || "Super Administrator",
      role: "super_admin",
      status: "active",
      emailVerified: true,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (!existingDoc.exists) {
      updatePayload.createdAt = FieldValue.serverTimestamp();
      await userRef.set(updatePayload);
      console.log("✅ Tạo mới hồ sơ người dùng trong Firestore!");
    } else {
      await userRef.set(updatePayload, { merge: true });
      console.log("✅ Cập nhật quyền super_admin trong Firestore thành công!");
    }

    // 3. Write Audit Log
    const auditRef = db.collection("auditLogs").doc();
    await auditRef.set({
      id: auditRef.id,
      actorUid: "system-cli",
      actorEmail: "cli@dktest.local",
      actorRole: "super_admin",
      action: "bootstrap_super_admin",
      targetUid: userRecord.uid,
      targetEmail: userRecord.email,
      targetRole: "super_admin",
      details: {
        method: "scripts/bootstrap-super-admin.ts",
      },
      ip: "127.0.0.1",
      userAgent: "DkTest CLI",
      timestamp: Date.now(),
    });

    console.log("\n🎉 THÀNH CÔNG! Tài khoản hiện có toàn quyền Super Admin:");
    console.log(`   - UID:   ${userRecord.uid}`);
    console.log(`   - Email: ${userRecord.email}`);
    console.log(`   - Role:  super_admin`);
    console.log(`   - Status: active`);
    console.log("\n👉 Người dùng có thể đăng nhập tại: /admin/login\n");
  } catch (error: any) {
    console.error("\n❌ Thất bại khi thiết lập Super Admin:", error.message || error);
    process.exit(1);
  }
}

main();
