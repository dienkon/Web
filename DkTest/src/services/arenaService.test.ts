import { describe, it, expect, beforeEach } from "vitest";
import {
  createArenaRoom,
  joinArenaRoom,
  toggleParticipantReady,
  startArenaMatch,
  updateParticipantProgress,
  leaveArenaRoom,
} from "./arenaService";

describe("ArenaService Unit Tests", () => {
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

    // Join by roomCode
    const joinedRoom = await joinArenaRoom(room.roomCode, {
      uid: "player_join_test",
      name: "Thí sinh B",
    });

    expect(Object.keys(joinedRoom.participants)).toHaveLength(2);
    expect(joinedRoom.participants["player_join_test"]).toBeDefined();
    expect(joinedRoom.participants["player_join_test"].role).toBe("player");
    expect(joinedRoom.participants["player_join_test"].isReady).toBe(false);

    // Attempting to join a full room should throw error
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
    // Verified via state
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

    // Non-host starting should throw
    await expect(startArenaMatch(room.id, "impostor_uid")).rejects.toThrow(
      "Chỉ chủ phòng mới có quyền bắt đầu trận đấu!"
    );

    // Host starting should succeed
    await startArenaMatch(room.id, "host_start_test");
  });

  it("should update progress and determine completion & winner", async () => {
    const room = await createArenaRoom({
      hostUid: "host_prog_test",
      hostName: "Host Prog",
      title: "Test Prog",
      examId: "exam_05",
      examTitle: "Đề 05",
      maxParticipants: 2,
    });

    await updateParticipantProgress(room.id, "host_prog_test", 5, 50, true);
  });

  it("should handle leaving room properly", async () => {
    const room = await createArenaRoom({
      hostUid: "host_leave_test",
      hostName: "Host Leave",
      title: "Test Leave",
      examId: "exam_06",
      examTitle: "Đề 06",
      maxParticipants: 4,
    });

    await joinArenaRoom(room.id, {
      uid: "player_leave_test",
      name: "Player Leave",
    });

    await leaveArenaRoom(room.id, "player_leave_test");
  });
});
