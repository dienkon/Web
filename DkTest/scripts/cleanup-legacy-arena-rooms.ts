import "dotenv/config";
import { adminDb } from "../server/firebaseAdmin.js";

const execute = process.argv.includes("--execute");

async function main() {
  if (!adminDb) {
    console.error("Firebase Admin SDK is not configured. Provide FIREBASE_PROJECT_ID / credentials in .env.");
    process.exit(1);
  }

  const colRef = adminDb.collection("arena_rooms");
  let totalFound = 0;
  let totalDeleted = 0;

  while (true) {
    const snap = await colRef.limit(350).get();
    if (snap.empty) break;

    totalFound += snap.size;
    console.log(
      `[cleanup-legacy-arena-rooms] Found batch of ${snap.size} docs in Firestore /arena_rooms (execute=${execute}).`
    );

    if (!execute) {
      console.log("[cleanup-legacy-arena-rooms] Dry run complete. Re-run with --execute to delete these docs.");
      break;
    }

    const batch = adminDb.batch();
    snap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
    totalDeleted += snap.size;
  }

  console.log(
    `[cleanup-legacy-arena-rooms] Summary: found=${totalFound}, deleted=${totalDeleted}, dryRun=${!execute}`
  );
}

main().catch((err) => {
  console.error("[cleanup-legacy-arena-rooms] Failed:", err);
  process.exit(1);
});
