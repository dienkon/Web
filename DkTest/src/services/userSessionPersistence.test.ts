import { describe, it, expect, beforeEach } from "vitest";
import {
  clearPersistentUserProfile,
  loadPersistentUserProfile,
  readPersistentProfileSync,
  savePersistentUserProfile,
} from "./userSessionPersistence";
import type { UserProfile } from "../types";

const demoProfile: UserProfile = {
  uid: "student_uid_001",
  username: "minhanh12a1",
  email: "minhanh12a1@dktest.local",
  displayName: "Nguyễn Minh Anh",
  fullName: "Nguyễn Minh Anh",
  role: "student",
  accountStatus: "active",
  provider: "username",
  authProvider: "username",
  emailVerified: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-11-26T00:00:00.000Z",
};

describe("userSessionPersistence — keeps user login state across app updates", () => {
  const storageMap: Record<string, string> = {};

  beforeEach(() => {
    for (const key of Object.keys(storageMap)) delete storageMap[key];
    (globalThis as any).localStorage = {
      getItem: (k: string) => storageMap[k] ?? null,
      setItem: (k: string, v: string) => {
        storageMap[k] = String(v);
      },
      removeItem: (k: string) => {
        delete storageMap[k];
      },
    };
  });

  it("persists and synchronously hydrates user profile across reloads", async () => {
    await savePersistentUserProfile(demoProfile);
    const syncRead = readPersistentProfileSync(demoProfile.uid);
    expect(syncRead?.uid).toBe(demoProfile.uid);
    expect(syncRead?.displayName).toBe("Nguyễn Minh Anh");

    const asyncRead = await loadPersistentUserProfile(demoProfile.uid);
    expect(asyncRead?.username).toBe("minhanh12a1");
  });

  it("clears persisted user profile only on explicit logout", async () => {
    await savePersistentUserProfile(demoProfile);
    await clearPersistentUserProfile(demoProfile.uid);
    expect(readPersistentProfileSync(demoProfile.uid)).toBeNull();
    expect(await loadPersistentUserProfile(demoProfile.uid)).toBeNull();
  });
});
