import dns from "dns";
import net from "net";

/**
 * Danh sách dải IPv4 bị cấm (Private, Loopback, Link-Local, Broadcast, Carrier-grade NAT, Cloud Metadata)
 */
const PRIVATE_IPV4_RANGES: Array<{ start: number; end: number }> = [
  // 0.0.0.0/8 (Current network)
  { start: ipToLong("0.0.0.0"), end: ipToLong("0.255.255.255") },
  // 10.0.0.0/8 (Private network)
  { start: ipToLong("10.0.0.0"), end: ipToLong("10.255.255.255") },
  // 127.0.0.0/8 (Loopback)
  { start: ipToLong("127.0.0.0"), end: ipToLong("127.255.255.255") },
  // 169.254.0.0/16 (Link-local, AWS/GCP Metadata 169.254.169.254)
  { start: ipToLong("169.254.0.0"), end: ipToLong("169.254.255.255") },
  // 172.16.0.0/12 (Private network)
  { start: ipToLong("172.16.0.0"), end: ipToLong("172.31.255.255") },
  // 192.168.0.0/16 (Private network)
  { start: ipToLong("192.168.0.0"), end: ipToLong("192.168.255.255") },
  // 100.64.0.0/10 (Carrier-grade NAT)
  { start: ipToLong("100.64.0.0"), end: ipToLong("100.127.255.255") },
  // 224.0.0.0/4 (Multicast)
  { start: ipToLong("224.0.0.0"), end: ipToLong("239.255.255.255") },
  // 240.0.0.0/4 (Reserved)
  { start: ipToLong("240.0.0.0"), end: ipToLong("255.255.255.255") },
];

function ipToLong(ip: string): number {
  return (
    ip
      .split(".")
      .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
  );
}

/**
 * Kiểm tra xem một IP có phải là địa chỉ nội bộ/private hay không.
 */
export function isPrivateIp(ip: string): boolean {
  if (!ip) return true;

  // IPv4 check
  if (net.isIPv4(ip)) {
    const long = ipToLong(ip);
    for (const range of PRIVATE_IPV4_RANGES) {
      if (long >= range.start && long <= range.end) {
        return true;
      }
    }
    return false;
  }

  // IPv6 check
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    // Loopback
    if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return true;
    // Unspecified
    if (lower === "::" || lower === "0:0:0:0:0:0:0:0") return true;
    // Unique local address (fc00::/7)
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    // Link-local (fe80::/10)
    if (lower.startsWith("fe80")) return true;
    // IPv4-mapped IPv6 (::ffff:192.168.1.1)
    if (lower.startsWith("::ffff:")) {
      const v4Part = lower.replace("::ffff:", "");
      if (net.isIPv4(v4Part)) return isPrivateIp(v4Part);
    }
    return false;
  }

  return true;
}

/**
 * Xác thực an toàn URL chống SSRF:
 * 1. Chỉ chấp nhận HTTP/HTTPS
 * 2. Phân giải DNS và kiểm tra IP
 * 3. Chặn localhost, IP nội bộ, link-local, cloud metadata
 */
export async function validateUrlForSsrf(rawUrl: string): Promise<{
  url: URL;
  resolvedIp: string;
}> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error(`Định dạng URL không hợp lệ: "${rawUrl}"`);
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error(
      `Giao thức không được hỗ trợ: "${parsedUrl.protocol}". Chỉ chấp nhận http: hoặc https:`
    );
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Chặn trực tiếp các hostname cấm
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "metadata.google.internal" ||
    hostname === "169.254.169.254"
  ) {
    throw new Error(
      `Truy cập bị từ chối (SSRF Protection): Hostname nội bộ "${hostname}" bị cấm.`
    );
  }

  // Nếu hostname là IP trực tiếp
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error(
        `Truy cập bị từ chối (SSRF Protection): Địa chỉ IP nội bộ "${hostname}" bị cấm.`
      );
    }
    return { url: parsedUrl, resolvedIp: hostname };
  }

  // Phân giải DNS để lấy IP thực tế
  try {
    const lookup = await dns.promises.lookup(hostname, { all: true });
    if (!lookup || lookup.length === 0) {
      throw new Error(`Không thể phân giải tên miền: "${hostname}"`);
    }

    for (const entry of lookup) {
      if (isPrivateIp(entry.address)) {
        throw new Error(
          `Truy cập bị từ chối (SSRF Protection): Tên miền "${hostname}" phân giải ra IP nội bộ ${entry.address}.`
        );
      }
    }

    return { url: parsedUrl, resolvedIp: lookup[0].address };
  } catch (err: any) {
    if (err.message.includes("SSRF Protection")) throw err;
    throw new Error(`Lỗi kiểm tra DNS cho tên miền "${hostname}": ${err.message}`);
  }
}
