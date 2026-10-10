import { describe, it, expect } from "vitest";
import { isPrivateIp, validateUrlForSsrf } from "../server/services/webImporter/ssrfGuard";

describe("SSRF Protection Guard", () => {
  it("correctly identifies private IPv4 addresses", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("10.0.0.1")).toBe(true);
    expect(isPrivateIp("192.168.1.1")).toBe(true);
    expect(isPrivateIp("172.16.0.1")).toBe(true);
    expect(isPrivateIp("172.31.255.255")).toBe(true);
    expect(isPrivateIp("169.254.169.254")).toBe(true); // AWS / Cloud metadata
    expect(isPrivateIp("0.0.0.0")).toBe(true);

    // Public IPs
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp("1.1.1.1")).toBe(false);
  });

  it("correctly identifies private IPv6 addresses", () => {
    expect(isPrivateIp("::1")).toBe(true);
    expect(isPrivateIp("::")).toBe(true);
    expect(isPrivateIp("fc00::1")).toBe(true);
    expect(isPrivateIp("fe80::1")).toBe(true);
    expect(isPrivateIp("::ffff:192.168.1.1")).toBe(true);
  });

  it("rejects dangerous protocols (file, ftp, gopher)", async () => {
    await expect(validateUrlForSsrf("file:///etc/passwd")).rejects.toThrow(
      "Giao thức không được hỗ trợ"
    );
    await expect(validateUrlForSsrf("ftp://example.com/test")).rejects.toThrow(
      "Giao thức không được hỗ trợ"
    );
    await expect(validateUrlForSsrf("gopher://example.com")).rejects.toThrow(
      "Giao thức không được hỗ trợ"
    );
  });

  it("rejects localhost and cloud metadata hostnames directly", async () => {
    await expect(validateUrlForSsrf("http://localhost:3000/api")).rejects.toThrow(
      "Hostname nội bộ"
    );
    await expect(
      validateUrlForSsrf("http://127.0.0.1:8080/admin")
    ).rejects.toThrow("Địa chỉ IP nội bộ");
    await expect(
      validateUrlForSsrf("http://169.254.169.254/latest/meta-data")
    ).rejects.toThrow("SSRF Protection");
  });
});
