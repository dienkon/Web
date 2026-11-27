/**
 * Lightweight, zero-dependency PKZIP (STORE method, UTF-8 filenames) archive builder.
 *
 * PDFs, DOCX, PPTX, XLSX, and ZIP files are already internally compressed, so
 * PKZIP method 0 (STORE) creates valid standard `.zip` archives with nested
 * Vietnamese folder paths in milliseconds without CPU overhead.
 */

export interface ZipInputEntry {
  /** Relative path inside the ZIP archive, e.g. "Toán 12/Đề thi thử/Đề số 1.pdf" */
  path: string;
  /** Raw binary bytes of the file */
  data: Uint8Array;
  /** Optional modification date */
  modifiedAt?: Date;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function computeCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function sanitizeZipEntryPath(rawPath: string): string {
  const segments = String(rawPath || "")
    .replace(/\\/g, "/")
    .split("/")
    .map((s) => s.trim())
    .filter((seg) => seg.length > 0 && seg !== "." && seg !== ".." && !/^\.+$/.test(seg))
    .map((seg) => seg.replace(/[:*?"<>|\r\n\0]+/g, "_").trim().slice(0, 110))
    .filter((seg) => seg.length > 0);

  if (segments.length === 0) return "Tai_lieu_DkTEST.pdf";
  return segments.join("/");
}

function encodeDosDateTime(date: Date): { dosTime: number; dosDate: number } {
  const year = Math.max(1980, Math.min(2107, date.getFullYear()));
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  const dosTime = ((hours & 0x1f) << 11) | ((minutes & 0x3f) << 5) | (seconds & 0x1f);
  const dosDate = (((year - 1980) & 0x7f) << 9) | ((month & 0x0f) << 5) | (day & 0x1f);
  return { dosTime, dosDate };
}

function deduplicateZipPaths(entries: ZipInputEntry[]): Array<{
  cleanPath: string;
  data: Uint8Array;
  modifiedAt: Date;
}> {
  const used = new Set<string>();
  return entries.map((entry) => {
    const base = sanitizeZipEntryPath(entry.path);
    let candidate = base;
    let suffix = 2;
    while (used.has(candidate.toLowerCase())) {
      const dotIdx = base.lastIndexOf(".");
      const slashIdx = base.lastIndexOf("/");
      if (dotIdx > slashIdx + 1) {
        candidate = `${base.slice(0, dotIdx)} (${suffix})${base.slice(dotIdx)}`;
      } else {
        candidate = `${base} (${suffix})`;
      }
      suffix++;
    }
    used.add(candidate.toLowerCase());
    return {
      cleanPath: candidate,
      data: entry.data,
      modifiedAt: entry.modifiedAt || new Date(),
    };
  });
}

export function buildZipArchiveBytes(entries: ZipInputEntry[]): Uint8Array {
  const normalized = deduplicateZipPaths(entries);
  const encoder = new TextEncoder();

  const prepared = normalized.map((item) => {
    const nameBytes = encoder.encode(item.cleanPath);
    const crc = computeCrc32(item.data);
    const { dosTime, dosDate } = encodeDosDateTime(item.modifiedAt);
    return {
      ...item,
      nameBytes,
      crc,
      dosTime,
      dosDate,
    };
  });

  let localSectionBytes = 0;
  let centralSectionBytes = 0;
  for (const p of prepared) {
    localSectionBytes += 30 + p.nameBytes.length + p.data.length;
    centralSectionBytes += 46 + p.nameBytes.length;
  }

  const totalBytes = localSectionBytes + centralSectionBytes + 22;
  const out = new Uint8Array(totalBytes);
  const view = new DataView(out.buffer);

  let offset = 0;
  const localHeaderOffsets: number[] = [];

  // 1. Write Local File Headers + File Payloads
  for (const p of prepared) {
    localHeaderOffsets.push(offset);

    view.setUint32(offset, 0x04034b50, true); // Local file header signature
    view.setUint16(offset + 4, 20, true); // Version needed to extract (2.0)
    view.setUint16(offset + 6, 0x0800, true); // Bit 11 = UTF-8 filename & comment
    view.setUint16(offset + 8, 0, true); // Compression method 0 = STORE
    view.setUint16(offset + 10, p.dosTime, true);
    view.setUint16(offset + 12, p.dosDate, true);
    view.setUint32(offset + 14, p.crc, true);
    view.setUint32(offset + 18, p.data.length, true); // Compressed size
    view.setUint32(offset + 22, p.data.length, true); // Uncompressed size
    view.setUint16(offset + 26, p.nameBytes.length, true); // File name length
    view.setUint16(offset + 28, 0, true); // Extra field length

    out.set(p.nameBytes, offset + 30);
    out.set(p.data, offset + 30 + p.nameBytes.length);
    offset += 30 + p.nameBytes.length + p.data.length;
  }

  const centralDirStart = offset;

  // 2. Write Central Directory Headers
  for (let i = 0; i < prepared.length; i++) {
    const p = prepared[i];
    view.setUint32(offset, 0x02014b50, true); // Central directory file header signature
    view.setUint16(offset + 4, 20, true); // Version made by
    view.setUint16(offset + 6, 20, true); // Version needed to extract
    view.setUint16(offset + 8, 0x0800, true); // UTF-8 flag
    view.setUint16(offset + 10, 0, true); // Method 0 = STORE
    view.setUint16(offset + 12, p.dosTime, true);
    view.setUint16(offset + 14, p.dosDate, true);
    view.setUint32(offset + 16, p.crc, true);
    view.setUint32(offset + 20, p.data.length, true);
    view.setUint32(offset + 24, p.data.length, true);
    view.setUint16(offset + 28, p.nameBytes.length, true);
    view.setUint16(offset + 30, 0, true); // Extra length
    view.setUint16(offset + 32, 0, true); // File comment length
    view.setUint16(offset + 34, 0, true); // Disk number start
    view.setUint16(offset + 36, 0, true); // Internal file attributes
    view.setUint32(offset + 38, 0, true); // External file attributes
    view.setUint32(offset + 42, localHeaderOffsets[i], true); // Relative offset of local header

    out.set(p.nameBytes, offset + 46);
    offset += 46 + p.nameBytes.length;
  }

  const centralDirSize = offset - centralDirStart;

  // 3. Write End of Central Directory Record (EOCD)
  view.setUint32(offset, 0x06054b50, true);
  view.setUint16(offset + 4, 0, true); // Number of this disk
  view.setUint16(offset + 6, 0, true); // Disk where central directory starts
  view.setUint16(offset + 8, prepared.length, true); // Entries on this disk
  view.setUint16(offset + 10, prepared.length, true); // Total entries
  view.setUint32(offset + 12, centralDirSize, true);
  view.setUint32(offset + 16, centralDirStart, true);
  view.setUint16(offset + 20, 0, true); // Comment length

  return out;
}

/**
 * Lightweight inspector used in tests & diagnostics to list entries from a PKZIP buffer.
 */
export function listZipArchiveEntries(zipBytes: Uint8Array): Array<{
  path: string;
  size: number;
  crc32: number;
}> {
  const view = new DataView(zipBytes.buffer, zipBytes.byteOffset, zipBytes.byteLength);
  const decoder = new TextDecoder();
  // Locate EOCD at the end of the buffer
  let eocdOffset = -1;
  for (let i = zipBytes.length - 22; i >= Math.max(0, zipBytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) {
    throw new Error("Invalid ZIP buffer: EOCD signature not found.");
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  let cdOffset = view.getUint32(eocdOffset + 16, true);
  const results: Array<{ path: string; size: number; crc32: number }> = [];

  for (let i = 0; i < totalEntries; i++) {
    if (view.getUint32(cdOffset, true) !== 0x02014b50) {
      throw new Error("Invalid Central Directory entry signature.");
    }
    const crc32 = view.getUint32(cdOffset + 16, true);
    const size = view.getUint32(cdOffset + 24, true);
    const nameLen = view.getUint16(cdOffset + 28, true);
    const extraLen = view.getUint16(cdOffset + 30, true);
    const commentLen = view.getUint16(cdOffset + 32, true);
    const nameBytes = zipBytes.subarray(cdOffset + 46, cdOffset + 46 + nameLen);
    results.push({
      path: decoder.decode(nameBytes),
      size,
      crc32,
    });
    cdOffset += 46 + nameLen + extraLen + commentLen;
  }

  return results;
}
