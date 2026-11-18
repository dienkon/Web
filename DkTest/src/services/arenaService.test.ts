import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import {
  ARENA_ROOM_TTL_MS,
  clearArenaMemoryStoreForTests,
  createArenaRoom,
  isArenaRoomExpired,
  joinArenaRoom,
  toggleParticipantReady,
  startArenaMatch,
  updateParticipantProgress,
  leaveArenaRoom,
  subscribeToArenaRoom,
} from "./arenaService";

describe("ArenaService Unit Tests (RTDB-backed, 0 Firestore reads)", () => {
  beforeEach(() => {
    clearArenaMemoryStoreForTests();
  });

  it("never imports firebase/firestore so Arena causes zero Firestore quota reads", () => {
    const source = readFileSync("src/services/arenaService.ts", "utf8");
    expect(source).not.toContain("firebase/firestore");
    expect(source).toContain("firebase/database");
  });

  it("should successfully create an arena room with valid code and host participant", async () => {
    const room = await createArenaRoom({
      hostUid: "host_123",
      hostName: "Nguyễn Văn Host",
      title: "Phòng Đấu Toán 12",
      examId: "exam_test_01",
      examTitle: "Đề Thi Thử Toán 12",
      maxParticipants: 4,
    });

    expect(room).toBeDefined();
    expect(room.id).toContain("arena_");
    expect(room.roomCode).toHaveLength(6);
    expect(room.status).toBe("waiting");
    expect(room.maxParticipants).toBe(4);
    expect(room.participants["host_123"]).toBeDefined();
    expect(room.participants["host_123"].role).toBe("host");
    expect(room.participants["host_123"].isReady).toBe(true);
  });

  it("should allow a second player to join via room ID or room code", async () => {
    const room = await createArenaRoom({
      hostUid: "host_join_test",
      hostName: "Host A",
      title: "Phòng Thi Thử",
      examId: "exam_02",
      examTitle: "Đề Thi 02",
      maxParticipants: 2,
    });

    const joinedRoom = await joinArenaRoom(room.roomCode, {
      uid: "player_join_test",
      name: "Thí sinh B",
    });

    expect(Object.keys(joinedRoom.participants)).toHaveLength(2);
    expect(joinedRoom.participants["player_join_test"]).toBeDefined();
    expect(joinedRoom.participants["player_join_test"].role).toBe("player");
    expect(joinedRoom.participants["player_join_test"].isReady).toBe(false);

    await expect(
      joinArenaRoom(room.roomCode, {
        uid: "player_3_excess",
        name: "Thí sinh C",
      })
    ).rejects.toThrow("Phòng thi đã đủ số lượng người tham gia!");
  });

  it("should allow participant to toggle readiness", async () => {
    const room = await createArenaRoom({
      hostUid: "host_ready_test",
      hostName: "Host Ready",
      title: "Test Ready",
      examId: "exam_03",
      examTitle: "Đề 03",
      maxParticipants: 4,
    });

    await joinArenaRoom(room.id, {
      uid: "player_ready_test",
      name: "Player Ready",
    });

    await toggleParticipantReady(room.id, "player_ready_test", true);
    let latest: any = null;
    const unsub = subscribeToArenaRoom(room.id, (r) => {
      latest = r;
    });
    expect(latest?.participants?.player_ready_test?.isReady).toBe(true);
    unsub();
  });

  it("should start match only when host initiates", async () => {
    const room = await createArenaRoom({
      hostUid: "host_start_test",
      hostName: "Host Start",
      title: "Test Start",
      examId: "exam_04",
      examTitle: "Đề 04",
      maxParticipants: 4,
    });

    await expect(startArenaMatch(room.id, "impostor_uid")).rejects.toThrow(
      "Chỉ chủ phòng mới có quyền bắt đầu trận đấu!"
    );

    await startArenaMatch(room.id, "host_start_test");
  });

  it("should update progress and determine completion & winner, then allow finished players to leave individually", async () => {
    const room = await createArenaRoom({
      hostUid: "host_prog_test",
      hostName: "Host Prog",
      title: "Test Prog",
      examId: "exam_05",
      examTitle: "Đề 05",
      maxParticipants: 2,
    });
    await joinArenaRoom(room.id, { uid: "player_prog_test", name: "Player 2" });
    await startArenaMatch(room.id, "host_prog_test");

    await updateParticipantProgress(room.id, "host_prog_test", 5, 50, true);
    await updateParticipantProgress(room.id, "player_prog_test", 5, 40, true);

    let latest: any = null;
    const unsub = subscribeToArenaRoom(room.id, (r) => {
      latest = r;
    });
    expect(latest?.status).toBe("finished");
    expect(latest?.winnerUid).toBe("host_prog_test");

    // Host leaving a finished room should NOT kick out other players still viewing podium
    await leaveArenaRoom(room.id, "host_prog_test");
    expect(latest?.participants?.player_prog_test).toBeDefined();

    // Once the last player leaves, room is cleaned up
    await leaveArenaRoom(room.id, "player_prog_test");
    let afterCleanup: any = "unset";
    const unsub2 = subscribeToArenaRoom(room.id, (r) => {
      afterCleanup = r;
    });
    unsub();
    unsub2();
    expect(afterCleanup === "unset" || afterCleanup === null).toBe(true);
  });

  it("should expire stale rooms and remove waiting rooms when host leaves", async () => {
    const room = await createArenaRoom({
      hostUid: "host_leave_test",
      hostName: "Host Leave",
      title: "Test Leave",
      examId: "exam_06",
      examTitle: "Đề 06",
      maxParticipants: 4,
    });

    expect(isArenaRoomExpired(room, room.createdAt + ARENA_ROOM_TTL_MS + 1000)).toBe(true);

    await joinArenaRoom(room.id, {
      uid: "player_leave_test",
      name: "Player Leave",
    });

    await leaveArenaRoom(room.id, "player_leave_test");
    await leaveArenaRoom(room.id, "host_leave_test");
    await expect(joinArenaRoom(room.roomCode, { uid: "late_user", name: "Late" })).rejects.toThrow();
  });
});
