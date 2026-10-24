import { describe, it, expect, vi } from "vitest";
import {
  isScreenshotKeyEvent,
  isMobileScreenshotTouch,
  sanitizeClipboardOnViolation,
} from "./antiCheatService";

describe("antiCheatService", () => {
  it("detects PrintScreen key correctly", () => {
    expect(isScreenshotKeyEvent({ key: "PrintScreen" })).toBe(true);
    expect(isScreenshotKeyEvent({ code: "PrintScreen" })).toBe(true);
    expect(isScreenshotKeyEvent({ keyCode: 44 })).toBe(true);
  });

  it("detects Windows Snipping Tool shortcut (Win+Shift+S / Meta+Shift+S)", () => {
    expect(isScreenshotKeyEvent({ key: "s", metaKey: true, shiftKey: true })).toBe(true);
    expect(isScreenshotKeyEvent({ code: "KeyS", metaKey: true, shiftKey: true })).toBe(true);
    expect(isScreenshotKeyEvent({ key: "S", ctrlKey: true, shiftKey: true })).toBe(true);
  });

  it("detects MacOS screenshot shortcuts (Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5)", () => {
    expect(isScreenshotKeyEvent({ key: "3", metaKey: true, shiftKey: true })).toBe(true);
    expect(isScreenshotKeyEvent({ key: "4", metaKey: true, shiftKey: true })).toBe(true);
    expect(isScreenshotKeyEvent({ key: "5", metaKey: true, shiftKey: true })).toBe(true);
  });

  it("detects mobile hardware volume down screenshot trigger keys", () => {
    expect(isScreenshotKeyEvent({ key: "VolumeDown" })).toBe(true);
    expect(isScreenshotKeyEvent({ code: "VolumeDown" })).toBe(true);
    expect(isScreenshotKeyEvent({ key: "AudioVolumeDown" })).toBe(true);
    expect(isScreenshotKeyEvent({ keyCode: 174 })).toBe(true);
  });

  it("detects mobile 3-finger swipe screenshot gesture correctly", () => {
    expect(isMobileScreenshotTouch({ touches: [{ length: 1 }] })).toBe(false);
    expect(isMobileScreenshotTouch({ touches: [{ length: 1 }, { length: 1 }] })).toBe(false);
    expect(isMobileScreenshotTouch({ touches: [{ length: 1 }, { length: 1 }, { length: 1 }] })).toBe(true);
    expect(isMobileScreenshotTouch({ touches: [{}, {}, {}, {}] as any })).toBe(true);
  });

  it("does not trigger on normal typing keys", () => {
    expect(isScreenshotKeyEvent({ key: "a" })).toBe(false);
    expect(isScreenshotKeyEvent({ key: "A", shiftKey: true })).toBe(false);
    expect(isScreenshotKeyEvent({ key: "Enter" })).toBe(false);
  });

  it("sanitizes clipboard on violation without crashing", async () => {
    await expect(sanitizeClipboardOnViolation()).resolves.toBeUndefined();
  });
});
