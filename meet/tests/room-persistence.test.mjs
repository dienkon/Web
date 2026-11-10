import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const roomsModule = new URL('../server/dist/rooms.js', import.meta.url).href;
const identityModule = new URL('../server/dist/identity.js', import.meta.url).href;

test('room code, owner, lock, approval and permission settings survive a process restart', () => {
  const directory = mkdtempSync(join(tmpdir(), 'meetclass-persistence-'));
  const storage = join(directory, 'rooms.json');
  const run = (source, values = {}) => execFileSync(process.execPath, ['--input-type=module', '-e', source], {
    env: { ...process.env, ROOM_STORE_PATH: storage, ...values }, encoding: 'utf8',
  });
  try {
    const created = JSON.parse(run(`
      import { roomManager } from ${JSON.stringify(roomsModule)};
      const { room, hostToken } = roomManager.createRoom();
      room.isLocked = true; room.requireApproval = true; room.hostSettings.allowMic = false;
      roomManager.persist();
      console.log(JSON.stringify({ code: room.code, hostToken }));
    `));
    assert.match(created.code, /^[A-Z2-9]{9}$/);
    run(`
      import assert from 'node:assert/strict';
      import { roomManager } from ${JSON.stringify(roomsModule)};
      import { hashToken } from ${JSON.stringify(identityModule)};
      const room = roomManager.getRoom(process.env.TEST_ROOM);
      assert.ok(room);
      assert.equal(room.ownerTokenHash, hashToken(process.env.TEST_OWNER_TOKEN));
      assert.equal(room.isLocked, true);
      assert.equal(room.requireApproval, true);
      assert.equal(room.hostSettings.allowMic, false);
      assert.equal(room.participants.size, 0);
      assert.equal(room.hostId, '');
      assert.equal(roomManager.getRoom('DOESNOTEXIST'), undefined);
    `, { TEST_ROOM: created.code, TEST_OWNER_TOKEN: created.hostToken });
  } finally {
    rmSync(storage, { force: true });
    rmSync(`${storage}.tmp`, { force: true });
    rmSync(`${storage}.key`, { force: true });
    rmdirSync(directory);
  }
});


test('signed owner capability restores a locked room after free hosting loses its files', () => {
  const directory = mkdtempSync(join(tmpdir(), 'meetclass-free-host-'));
  const storage = join(directory, 'rooms.json');
  const secret = 'test-only-stable-signing-secret-32-characters';
  const run = (source, values = {}) => execFileSync(process.execPath, ['--input-type=module', '-e', source], {
    env: { ...process.env, ROOM_STORE_PATH: storage, ROOM_SIGNING_SECRET: secret, ...values }, encoding: 'utf8',
  });
  try {
    const created = JSON.parse(run(`
      import { roomManager } from ${JSON.stringify(roomsModule)};
      const { room, hostToken } = roomManager.createRoom();
      console.log(JSON.stringify({ code: room.code, hostToken }));
    `));
    rmSync(storage); // Models Render Free replacing its ephemeral filesystem.
    run(`
      import assert from 'node:assert/strict';
      import { roomManager } from ${JSON.stringify(roomsModule)};
      import { hashToken } from ${JSON.stringify(identityModule)};
      const code = process.env.TEST_ROOM, token = process.env.TEST_OWNER_TOKEN;
      assert.equal(roomManager.getRoom(code), undefined);
      assert.equal(roomManager.restoreOwnedRoom(code, 'a'.repeat(128)), undefined);
      const otherCode = code === 'AAAAAAAAA' ? 'BBBBBBBBB' : 'AAAAAAAAA';
      assert.equal(roomManager.restoreOwnedRoom(otherCode, token), undefined);
      const room = roomManager.restoreOwnedRoom(code, token, {
        isLocked: true, requireApproval: true, hostSettings: { allowMic: false },
      });
      assert.equal(room.ownerTokenHash, hashToken(token));
      assert.equal(room.isLocked, true);
      assert.equal(room.requireApproval, true);
      assert.equal(room.hostSettings.allowMic, false);
      assert.equal(room.participants.size, 0);
      const existing = roomManager.restoreOwnedRoom(code, token, { isLocked: false });
      assert.equal(existing.isLocked, true); // Recovery cannot overwrite a live room.
    `, { TEST_ROOM: created.code, TEST_OWNER_TOKEN: created.hostToken });
  } finally {
    rmSync(storage, { force: true });
    rmSync(`${storage}.tmp`, { force: true });
    rmdirSync(directory);
  }
});
