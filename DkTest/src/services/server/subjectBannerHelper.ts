/**
 * subjectBannerHelper.ts
 *
 * Subject standardization, automatic exam subject detection, and dedicated
 * Open Graph preview banner URL mapping for social platforms (Zalo, Facebook, etc.).
 */

export interface SubjectBannerInfo {
  key: string;
  name: string;
  canonicalName: string;
  category: string;
  bannerFileName: string;
  aliases: string[];
}

export const SUBJECT_BANNER_MAP: Record<string, SubjectBannerInfo> = {
  math: {
    key: "math",
    name: "Toán học",
    canonicalName: "Toán học",
    category: "Môn bắt buộc",
    bannerFileName: "math.jpg",
    aliases: [
      "toán",
      "toán học",
      "toan",
      "toan hoc",
      "đại số",
      "dai so",
      "hình học",
      "hinh hoc",
      "giải tích",
      "giai tich",
      "math",
      "mathematics",
      "algebra",
      "geometry",
      "calculus",
    ],
  },
  english: {
    key: "english",
    name: "Tiếng Anh",
    canonicalName: "Tiếng Anh",
    category: "Môn ngoại ngữ",
    bannerFileName: "english.jpg",
    aliases: [
      "tiếng anh",
      "tieng anh",
      "anh",
      "english",
      "ngoại ngữ",
      "ngoai ngu",
      "anh văn",
      "anh van",
      "ielts",
      "toeic",
      "toefl",
    ],
  },
  physics: {
    key: "physics",
    name: "Vật lý",
    canonicalName: "Vật lý",
    category: "Khoa học tự nhiên",
    bannerFileName: "physics.jpg",
    aliases: [
      "vật lý",
      "vật lí",
      "vat ly",
      "vat li",
      "lý",
      "lí",
      "ly",
      "li",
      "physics",
      "cơ học",
      "quang học",
      "điện từ",
    ],
  },
  chemistry: {
    key: "chemistry",
    name: "Hóa học",
    canonicalName: "Hóa học",
    category: "Khoa học tự nhiên",
    bannerFileName: "chemistry.jpg",
    aliases: [
      "hóa học",
      "hoá học",
      "hóa",
      "hoá",
      "hoa hoc",
      "hoa",
      "chemistry",
      "hóa hữu cơ",
      "hóa vô cơ",
    ],
  },
  biology: {
    key: "biology",
    name: "Sinh học",
    canonicalName: "Sinh học",
    category: "Khoa học tự nhiên",
    bannerFileName: "biology.jpg",
    aliases: [
      "sinh học",
      "sinh",
      "sinh hoc",
      "biology",
      "di truyền",
      "sinh thái",
    ],
  },
  literature: {
    key: "literature",
    name: "Ngữ văn",
    canonicalName: "Ngữ văn",
    category: "Khoa học xã hội",
    bannerFileName: "literature.jpg",
    aliases: [
      "ngữ văn",
      "ngu van",
      "văn học",
      "van hoc",
      "văn",
      "van",
      "literature",
      "nghị luận",
      "đọc hiểu",
    ],
  },
  history: {
    key: "history",
    name: "Lịch sử",
    canonicalName: "Lịch sử",
    category: "Khoa học xã hội",
    bannerFileName: "history.jpg",
    aliases: [
      "lịch sử",
      "lich su",
      "sử",
      "su",
      "sử học",
      "su hoc",
      "history",
    ],
  },
  geography: {
    key: "geography",
    name: "Địa lý",
    canonicalName: "Địa lý",
    category: "Khoa học xã hội",
    bannerFileName: "geography.jpg",
    aliases: [
      "địa lý",
      "địa lí",
      "dia ly",
      "dia li",
      "địa",
      "dia",
      "geography",
      "atlat",
    ],
  },
  informatics: {
    key: "informatics",
    name: "Tin học",
    canonicalName: "Tin học",
    category: "Công nghệ & Lập trình",
    bannerFileName: "informatics.jpg",
    aliases: [
      "tin học",
      "tin hoc",
      "tin",
      "cntt",
      "it",
      "lập trình",
      "lap trinh",
      "coding",
      "code",
      "programming",
      "informatics",
      "computer science",
      "công nghệ thông tin",
      "thuật toán",
      "python",
      "c++",
      "pascal",
    ],
  },
  civics: {
    key: "civics",
    name: "Kinh tế & Pháp luật",
    canonicalName: "GDCD",
    category: "Khoa học xã hội",
    bannerFileName: "civics.jpg",
    aliases: [
      "gdcd",
      "giáo dục công dân",
      "giao duc cong dan",
      "công dân",
      "cong dan",
      "kinh tế & pháp luật",
      "kinh tế và pháp luật",
      "kinh te & phap luat",
      "kinh te va phap luat",
      "kinh tế pháp luật",
      "gdktepl",
      "gdktpl",
      "pháp luật",
      "civics",
    ],
  },
  technology: {
    key: "technology",
    name: "Công nghệ",
    canonicalName: "Công nghệ",
    category: "Kỹ thuật & Ứng dụng",
    bannerFileName: "technology.jpg",
    aliases: [
      "công nghệ",
      "cong nghe",
      "technology",
      "công nghiệp",
      "nông nghiệp",
    ],
  },
  "natural-sciences": {
    key: "natural-sciences",
    name: "Khoa học Tự nhiên",
    canonicalName: "Khoa học Tự nhiên",
    category: "Môn tích hợp",
    bannerFileName: "natural-sciences.jpg",
    aliases: [
      "khoa học tự nhiên",
      "khoa hoc tu nhien",
      "khtn",
      "natural sciences",
    ],
  },
  "social-sciences": {
    key: "social-sciences",
    name: "Lịch sử & Địa lý",
    canonicalName: "Lịch sử & Địa lý",
    category: "Môn tích hợp",
    bannerFileName: "social-sciences.jpg",
    aliases: [
      "lịch sử & địa lý",
      "lịch sử và địa lý",
      "lich su & dia ly",
      "lich su va dia ly",
      "lịch sử - địa lý",
      "sử địa",
      "su dia",
      "khoa học xã hội",
      "khoa hoc xa hoi",
      "khxh",
      "social sciences",
    ],
  },
  default: {
    key: "default",
    name: "Đề thi Tổng hợp",
    canonicalName: "Tổng hợp",
    category: "Khảo thí chuẩn hóa",
    bannerFileName: "default.jpg",
    aliases: [
      "tổng hợp",
      "tong hop",
      "đánh giá năng lực",
      "dgnl",
      "hsa",
      "v-sat",
      "tsa",
      "khác",
      "chưa phân loại",
      "all",
      "default",
    ],
  },
};

/**
 * Strips Vietnamese diacritics and converts special characters (đ/Đ -> d/D)
 * for resilient slug and code matching.
 */
export function stripAccents(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/**
 * Returns the subject key corresponding to a subject name, alias, slug, or exam object.
 * Maps all variations to one of the 14 standard keys:
 * 'math', 'english', 'physics', 'chemistry', 'biology', 'literature',
 * 'history', 'geography', 'informatics', 'civics', 'technology',
 * 'natural-sciences', 'social-sciences', or 'default'.
 */
export function getSubjectBannerKey(
  subjectOrExam?:
    | string
    | {
        subject?: string | null;
        title?: string | null;
        code?: string | null;
        id?: string | null;
      }
    | null
): string {
  if (!subjectOrExam) return "default";

  if (typeof subjectOrExam === "string") {
    const rawTrim = subjectOrExam.trim().toLowerCase();
    if (SUBJECT_BANNER_MAP[rawTrim]) {
      return rawTrim;
    }
  }

  const query =
    typeof subjectOrExam === "object"
      ? subjectOrExam
      : { subject: subjectOrExam };

  // 1. Direct subject field check first if provided
  if (query.subject && typeof query.subject === "string" && query.subject.trim()) {
    const rawSub = query.subject.trim();
    const subLower = rawSub.toLowerCase();
    if (
      subLower === "khác" ||
      subLower === "chưa phân loại" ||
      subLower === "other" ||
      subLower === "all" ||
      subLower === "tất cả"
    ) {
      return "default";
    }

    const subUnaccent = stripAccents(subLower);

    // Multi-word composite subjects
    if (
      subUnaccent.includes("khoa hoc tu nhien") ||
      subUnaccent === "khtn" ||
      subUnaccent.startsWith("khtn ") ||
      subUnaccent.startsWith("khtn-") ||
      subUnaccent.includes("natural sciences")
    ) {
      return "natural-sciences";
    }
    if (
      subUnaccent.includes("khoa hoc xa hoi") ||
      subUnaccent === "khxh" ||
      subUnaccent.startsWith("khxh ") ||
      subUnaccent.startsWith("khxh-") ||
      subUnaccent.includes("lich su & dia ly") ||
      subUnaccent.includes("lich su va dia ly") ||
      subUnaccent.includes("lich su - dia ly") ||
      subUnaccent.includes("su dia") ||
      subUnaccent.includes("social sciences")
    ) {
      return "social-sciences";
    }
    if (
      subUnaccent === "gdcd" ||
      subUnaccent.startsWith("gdcd") ||
      subUnaccent.includes("giao duc cong dan") ||
      subUnaccent.includes("kinh te & phap luat") ||
      subUnaccent.includes("kinh te va phap luat") ||
      subUnaccent.includes("kinh te phap luat") ||
      subUnaccent.includes("gdktepl") ||
      subUnaccent.includes("gdktpl") ||
      subUnaccent.includes("civics") ||
      subUnaccent === "cong dan" ||
      subUnaccent.startsWith("cong dan ") ||
      subUnaccent.startsWith("cong dan-") ||
      subUnaccent === "phap luat"
    ) {
      return "civics";
    }
    if (
      subUnaccent.includes("cong nghe thong tin") ||
      subUnaccent.includes("cntt") ||
      subUnaccent.includes("tin hoc") ||
      subUnaccent === "tin" ||
      subUnaccent.startsWith("tin ") ||
      subUnaccent.startsWith("tin-") ||
      subUnaccent.includes("lap trinh") ||
      subUnaccent.includes("informatics") ||
      subUnaccent.includes("computer science") ||
      subUnaccent.includes("coding") ||
      subUnaccent.includes("thuat toan")
    ) {
      return "informatics";
    }
    if (
      !subUnaccent.includes("thong tin") &&
      !subUnaccent.includes("cntt") &&
      (subUnaccent.includes("cong nghe") ||
        subUnaccent === "cn" ||
        subUnaccent.startsWith("cn ") ||
        subUnaccent.startsWith("cn-") ||
        subUnaccent.includes("technology"))
    ) {
      return "technology";
    }
    if (
      subUnaccent.includes("tieng anh") ||
      subUnaccent.includes("anh van") ||
      subUnaccent.includes("ngoai ngu") ||
      subUnaccent === "anh" ||
      subUnaccent.startsWith("anh ") ||
      subUnaccent.startsWith("anh-") ||
      subUnaccent.includes("english") ||
      subUnaccent === "ielts" ||
      subUnaccent === "toeic" ||
      subUnaccent === "toefl"
    ) {
      return "english";
    }
    if (
      subUnaccent.includes("dia ly") ||
      subUnaccent.includes("dia li") ||
      subUnaccent === "dia" ||
      subUnaccent.startsWith("dia ") ||
      subUnaccent.startsWith("dia-") ||
      subUnaccent.includes("geography") ||
      subUnaccent.includes("atlat")
    ) {
      return "geography";
    }
    if (
      subUnaccent.includes("vat ly") ||
      subUnaccent.includes("vat li") ||
      subUnaccent === "ly" ||
      subUnaccent === "li" ||
      subUnaccent.startsWith("ly ") ||
      subUnaccent.startsWith("ly-") ||
      subUnaccent.startsWith("li ") ||
      subUnaccent.startsWith("li-") ||
      subUnaccent.includes("physics") ||
      subUnaccent.includes("co hoc") ||
      subUnaccent.includes("quang hoc")
    ) {
      return "physics";
    }
    if (
      subUnaccent.includes("hoa hoc") ||
      subUnaccent === "hoa" ||
      subUnaccent.startsWith("hoa ") ||
      subUnaccent.startsWith("hoa-") ||
      subUnaccent.includes("chemistry")
    ) {
      return "chemistry";
    }
    if (
      subUnaccent.includes("sinh hoc") ||
      subUnaccent === "sinh" ||
      subUnaccent.startsWith("sinh ") ||
      subUnaccent.startsWith("sinh-") ||
      subUnaccent.includes("biology")
    ) {
      return "biology";
    }
    if (
      subUnaccent.includes("ngu van") ||
      subUnaccent.includes("van hoc") ||
      subUnaccent === "van" ||
      subUnaccent.startsWith("van ") ||
      subUnaccent.startsWith("van-") ||
      subUnaccent.includes("literature")
    ) {
      return "literature";
    }
    if (
      subUnaccent.includes("lich su") ||
      subUnaccent.includes("su hoc") ||
      subUnaccent === "su" ||
      subUnaccent.startsWith("su ") ||
      subUnaccent.startsWith("su-") ||
      subUnaccent.includes("history")
    ) {
      return "history";
    }
    if (
      subUnaccent.includes("toan hoc") ||
      subUnaccent === "toan" ||
      subUnaccent.startsWith("toan ") ||
      subUnaccent.startsWith("toan-") ||
      subUnaccent.includes("dai so") ||
      subUnaccent.includes("hinh hoc") ||
      subUnaccent.includes("giai tich") ||
      subUnaccent.includes("math")
    ) {
      return "math";
    }
  }

  // 2. Combined string (title + code + id)
  const title = (query.title || "").trim().toLowerCase();
  const code = (query.code || "").trim().toLowerCase();
  const id = (query.id || "").trim().toLowerCase();
  const combined = `${title} ${code} ${id}`;
  const unaccent = stripAccents(combined);

  // Multi-word composite subjects first:
  // KHTN
  if (
    /(?:^|[^\p{L}])(?:khtn|khoa\s*hoc\s*tu\s*nhien|natural\s*sciences)(?:[^\p{L}]|$)/iu.test(unaccent) ||
    unaccent.includes("khtn-") ||
    unaccent.includes("khtn_") ||
    unaccent.includes("khoa-hoc-tu-nhien")
  ) {
    return "natural-sciences";
  }

  // KHXH / Lịch sử & Địa lý
  if (
    /(?:^|[^\p{L}])(?:khxh|khoa\s*hoc\s*xa\s*hoi|lich\s*su\s*(?:&|\+|va|-)?\s*dia\s*l[yi]|su\s*(?:&|\+|va|-)?\s*dia|social\s*sciences)(?:[^\p{L}]|$)/iu.test(unaccent) ||
    unaccent.includes("khxh-") ||
    unaccent.includes("khxh_") ||
    unaccent.includes("lich-su-dia-ly")
  ) {
    return "social-sciences";
  }

  // GDCD / Kinh tế & Pháp luật
  if (
    /(?:^|[^\p{L}])(?:gdcd|cong\s*dan|kinh\s*te\s*(?:&|\+|va)?\s*phap\s*luat|phap\s*luat|gdkte?pl|civics)(?:[^\p{L}]|$)/iu.test(unaccent) ||
    unaccent.includes("gdcd-") ||
    unaccent.includes("gdcd_") ||
    unaccent.includes("kinh-te-phap-luat")
  ) {
    return "civics";
  }

  // Informatics / Coding (including CNTT, IT, Lập trình, Python, C++, Thuật toán, Công nghệ thông tin)
  if (
    /(?:^|[^\p{L}])(?:tin\s*hoc|lap\s*trinh|code|coding|cntt|thuat\s*toan|cong\s*nghe\s*thong\s*tin|informatics|programming|python|pascal|scratch)(?:[^\p{L}]|$)/iu.test(unaccent) ||
    /(?:^|[^\p{L}])(?:(?:de\s*thi|kiem\s*tra|khao\s*sat|on\s*tap|bai\s*tap|mon)\s+tin|tin[\s\-_.]*\d+|inf[\s\-_.]*\d+|cs[\s\-_.]*\d+)(?:[^\p{L}]|$)/iu.test(unaccent) ||
    unaccent.includes("tin-hoc") ||
    unaccent.includes("tin_hoc") ||
    /(?:^|[^\p{L}])tin[-_.]?\d+(?:[^\p{L}]|$)/iu.test(unaccent)
  ) {
    return "informatics";
  }

  // Technology (avoid false positive on CNTT)
  if (
    !unaccent.includes("cong nghe thong tin") &&
    !unaccent.includes("cntt") &&
    (/(?:^|[^\p{L}])(?:cong\s*nghe|technology|nong\s*nghiep|cong\s*nghiep)(?:[^\p{L}]|$)/iu.test(unaccent) ||
      /(?:^|[^\p{L}])(?:cn[\s\-_.]*\d+|tech[\s\-_.]*\d+)(?:[^\p{L}]|$)/iu.test(unaccent) ||
      unaccent.includes("cong-nghe") ||
      unaccent.includes("cong_nghe") ||
      unaccent.includes("congnghe"))
  ) {
    return "technology";
  }

  // English (guard against hình ảnh, bức ảnh)
  if (
    /(?:^|[^\p{L}])(?:tieng\s*anh|anh\s*van|english|ngoai\s*ngu|ielts|toeic|toefl)(?:[^\p{L}]|$)/iu.test(unaccent) ||
    /(?:^|[^\p{L}])(?:(?:de\s*thi|kiem\s*tra|khao\s*sat|on\s*tap|bai\s*tap|mon)\s+anh|anh[\s\-_.]*\d+|eng[\s\-_.]*\d+)(?:[^\p{L}]|$)/iu.test(unaccent) ||
    unaccent.includes("tieng-anh") ||
    unaccent.includes("tieng_anh") ||
    unaccent.includes("english-") ||
    /(?:^|[^\p{L}])(?:anh|eng)[-_.]?\d+(?:[^\p{L}]|$)/iu.test(unaccent)
  ) {
    return "english";
  }

  // Geography (guard against địa chỉ, địa bàn, địa điểm unless genuine subject keyword also exists)
  const cleanedForGeo = unaccent.replace(/(?:dia\s+chi|dia\s+ban|dia\s+diem)/g, "");
  if (
    /(?:^|[^\p{L}])(?:dia\s*l[yi]|atlat|geography)(?:[^\p{L}]|$)/iu.test(cleanedForGeo) ||
    /(?:^|[^\p{L}])(?:(?:de\s*thi|kiem\s*tra|khao\s*sat|on\s*tap|bai\s*tap|mon)\s+dia|dia[\s\-_.]*\d+|geo[\s\-_.]*\d+)(?:[^\p{L}]|$)/iu.test(cleanedForGeo) ||
    cleanedForGeo.includes("dia-ly") ||
    cleanedForGeo.includes("dia_ly") ||
    cleanedForGeo.includes("dia-li") ||
    /(?:^|[^\p{L}])(?:dia|geo)[-_.]?\d+(?:[^\p{L}]|$)/iu.test(cleanedForGeo)
  ) {
    return "geography";
  }

  // Physics (guard against địa lý, quản lý, xử lý, tâm lý, hợp lý unless genuine subject keyword also exists)
  const cleanedForPhysics = unaccent.replace(/(?:dia|quan|xu|tam|hop)\s+l[yi]/g, "");
  if (
    /(?:^|[^\p{L}])(?:vat\s*l[yi]|co\s*hoc|quang\s*hoc|dien\s*tu|dao\s*dong\s*dieu\s*hoa|physics)(?:[^\p{L}]|$)/iu.test(cleanedForPhysics) ||
    /(?:^|[^\p{L}])(?:(?:de\s*thi|kiem\s*tra|khao\s*sat|on\s*tap|bai\s*tap|mon)\s+(?:vat\s+)?l[yi]|l[yi][\s\-_.]*\d+|phy[\s\-_.]*\d+)(?:[^\p{L}]|$)/iu.test(cleanedForPhysics) ||
    cleanedForPhysics.includes("vat-ly") ||
    cleanedForPhysics.includes("vat_ly") ||
    cleanedForPhysics.includes("vat-li") ||
    /(?:^|[^\p{L}])(?:ly|li|phy)[-_.]?\d+(?:[^\p{L}]|$)/iu.test(cleanedForPhysics)
  ) {
    return "physics";
  }

  // Chemistry (guard against tiến hóa unless genuine chemistry keyword exists)
  const cleanedForChem = unaccent.replace(/tien\s+hoa/g, "");
  if (
    /(?:^|[^\p{L}])(?:hoa\s*hoc|bang\s*tuan\s*hoan|chemistry)(?:[^\p{L}]|$)/iu.test(cleanedForChem) ||
    /(?:^|[^\p{L}])(?:(?:de\s*thi|kiem\s*tra|khao\s*sat|on\s*tap|bai\s*tap|mon)\s+hoa|hoa[\s\-_.]*\d+|che[\s\-_.]*\d+)(?:[^\p{L}]|$)/iu.test(cleanedForChem) ||
    cleanedForChem.includes("hoa-hoc") ||
    cleanedForChem.includes("hoa_hoc") ||
    /(?:^|[^\p{L}])(?:hoa|che)[-_.]?\d+(?:[^\p{L}]|$)/iu.test(cleanedForChem)
  ) {
    return "chemistry";
  }

  // Biology (guard against học sinh, thí sinh, sinh viên, sinh nhật unless genuine biology keyword exists)
  const cleanedForBio = unaccent.replace(/(?:hoc|thi)\s+sinh|sinh\s+(?:vien|nhat)/g, "");
  if (
    /(?:^|[^\p{L}])(?:sinh\s*hoc|di\s*truyen|nhiem\s*sac\s*the|sinh\s*thai|te\s*bao|tien\s*hoa|chong\s*loc\s*tu\s*nhien|biology)(?:[^\p{L}]|$)/iu.test(cleanedForBio) ||
    /(?:^|[^\p{L}])(?:(?:de\s*thi|kiem\s*tra|khao\s*sat|on\s*tap|bai\s*tap|mon)\s+sinh|sinh[\s\-_.]*\d+|bio[\s\-_.]*\d+)(?:[^\p{L}]|$)/iu.test(cleanedForBio) ||
    cleanedForBio.includes("sinh-hoc") ||
    cleanedForBio.includes("sinh_hoc") ||
    /(?:^|[^\p{L}])(?:sinh|bio)[-_.]?\d+(?:[^\p{L}]|$)/iu.test(cleanedForBio)
  ) {
    return "biology";
  }

  // Literature (guard against văn bản pháp luật, vấn đề, tư vấn unless genuine literature keyword exists)
  const cleanedForLit = unaccent.replace(/(?:van\s+ban\s+phap\s+luat|van\s+de|tu\s+van)/g, "");
  if (
    /(?:^|[^\p{L}])(?:ngu\s*van|van\s*hoc|nghi\s*luan\s*xa\s*hoi|nghi\s*luan\s*van\s*hoc|doc\s*hieu|literature)(?:[^\p{L}]|$)/iu.test(cleanedForLit) ||
    /(?:^|[^\p{L}])(?:(?:de\s*thi|kiem\s*tra|khao\s*sat|on\s*tap|bai\s*tap|mon)\s+van|van[\s\-_.]*\d+|lit[\s\-_.]*\d+)(?:[^\p{L}]|$)/iu.test(cleanedForLit) ||
    cleanedForLit.includes("ngu-van") ||
    cleanedForLit.includes("ngu_van") ||
    /(?:^|[^\p{L}])(?:van|lit)[-_.]?\d+(?:[^\p{L}]|$)/iu.test(cleanedForLit)
  ) {
    return "literature";
  }

  // History (guard against sử dụng, giả sử unless genuine history keyword exists)
  const cleanedForHistory = unaccent.replace(/(?:su\s+dung|gia\s+su)/g, "");
  if (
    /(?:^|[^\p{L}])(?:lich\s*su|su\s*hoc|history)(?:[^\p{L}]|$)/iu.test(cleanedForHistory) ||
    /(?:^|[^\p{L}])(?:(?:de\s*thi|kiem\s*tra|khao\s*sat|on\s*tap|bai\s*tap|mon)\s+su|su[\s\-_.]*\d+|his[\s\-_.]*\d+)(?:[^\p{L}]|$)/iu.test(cleanedForHistory) ||
    cleanedForHistory.includes("lich-su") ||
    cleanedForHistory.includes("lich_su") ||
    /(?:^|[^\p{L}])(?:su|his)[-_.]?\d+(?:[^\p{L}]|$)/iu.test(cleanedForHistory)
  ) {
    return "history";
  }

  // Math (guard against thuật toán, thanh toán, an toàn, hoàn toàn unless genuine math keyword exists)
  const cleanedForMath = unaccent.replace(/(?:thuat|thanh|an|hoan)\s+toan/g, "");
  if (
    /(?:^|[^\p{L}])(?:toan\s*hoc|dai\s*so|hinh\s*hoc|giai\s*tich|math|mathematics|algebra|geometry|calculus)(?:[^\p{L}]|$)/iu.test(cleanedForMath) ||
    /(?:^|[^\p{L}])(?:(?:de\s*thi|kiem\s*tra|khao\s*sat|on\s*tap|bai\s*tap|mon)\s+toan|toan[\s\-_.]*\d+|mat[\s\-_.]*\d+)(?:[^\p{L}]|$)/iu.test(cleanedForMath) ||
    cleanedForMath.includes("toan-hoc") ||
    cleanedForMath.includes("toan_hoc") ||
    /(?:^|[^\p{L}])(?:toan|mat)[-_.]?\d+(?:[^\p{L}]|$)/iu.test(cleanedForMath) ||
    /(?:^|[^\p{L}])toan(?:[^\p{L}]|$)/iu.test(cleanedForMath)
  ) {
    return "math";
  }

  return "default";
}

/**
 * Standardizes common subject name variations and abbreviations into canonical Vietnamese names.
 * e.g., "Toán" -> "Toán học", "Lý" -> "Vật lý", "Hóa" -> "Hóa học", "Văn" -> "Ngữ văn", etc.
 */
export function standardizeExamSubject(rawSubject?: string | null): string {
  if (!rawSubject || typeof rawSubject !== "string") return "";
  const s = rawSubject.trim();
  if (!s) return "";
  const lower = s.toLowerCase();
  if (
    lower === "khác" ||
    lower === "chưa phân loại" ||
    lower === "other" ||
    lower === "all" ||
    lower === "tất cả"
  ) {
    return "Tổng hợp";
  }

  const key = getSubjectBannerKey(s);
  if (key && key !== "default" && SUBJECT_BANNER_MAP[key]) {
    return SUBJECT_BANNER_MAP[key].canonicalName;
  }

  return s;
}

/**
 * Detects the subject of an exam by inspecting subject property, title, code, and ID.
 * Returns canonical subject name (e.g. "Toán học", "Tiếng Anh", "Vật lý", etc.)
 */
export function detectExamSubject(
  exam?: {
    subject?: string | null;
    title?: string | null;
    code?: string | null;
    id?: string | null;
  } | null,
  defaultSubject = "Tổng hợp"
): string {
  if (!exam) return defaultSubject;

  const key = getSubjectBannerKey(exam);
  if (key && key !== "default" && SUBJECT_BANNER_MAP[key]) {
    return SUBJECT_BANNER_MAP[key].canonicalName;
  }

  if (exam.subject && typeof exam.subject === "string" && exam.subject.trim()) {
    const std = standardizeExamSubject(exam.subject.trim());
    if (std) return std;
  }

  return defaultSubject;
}

/**
 * Returns the absolute URL to the subject banner image.
 */
export function getSubjectBannerUrl(
  subjectOrExam:
    | string
    | {
        subject?: string | null;
        title?: string | null;
        code?: string | null;
        id?: string | null;
      }
    | null,
  baseUrl: string
): string {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const key = getSubjectBannerKey(subjectOrExam);
  const bannerFileName = SUBJECT_BANNER_MAP[key]?.bannerFileName || "default.jpg";
  return `${cleanBase}/images/subjects/${bannerFileName}`;
}

/**
 * Returns descriptive alt text for the subject banner.
 */
export function getSubjectBannerAlt(
  subjectOrExam:
    | string
    | {
        subject?: string | null;
        title?: string | null;
        code?: string | null;
        id?: string | null;
      }
    | null
): string {
  const key = getSubjectBannerKey(subjectOrExam);
  const info = SUBJECT_BANNER_MAP[key] || SUBJECT_BANNER_MAP.default;

  if (typeof subjectOrExam === "object" && subjectOrExam?.title && subjectOrExam.title.trim()) {
    return `Đề thi Môn ${info.name}: ${subjectOrExam.title.trim()} — DkTEST`;
  }
  return `Đề thi Môn ${info.name} — Nền tảng khảo thí & luyện thi DkTEST`;
}

/**
 * Resolves complete banner metadata for an exam.
 * If the exam has an uploaded custom image, it preserves that image.
 * Otherwise, it dynamically returns the dedicated subject banner (1200x630 JPEG).
 */
export function resolveExamSubjectBanner({
  exam,
  examId,
  baseUrl,
}: {
  exam?:
    | {
        subject?: string | null;
        title?: string | null;
        code?: string | null;
        id?: string | null;
        imageUrl?: string | null;
      }
    | null;
  examId?: string;
  baseUrl: string;
}): {
  key: string;
  subjectName: string;
  imageUrl: string;
  imageAlt: string;
  imageWidth: number;
  imageHeight: number;
  mimeType: string;
} {
  const cleanBase = baseUrl.replace(/\/+$/, "");

  // Custom uploaded image priority
  if (exam?.imageUrl && typeof exam.imageUrl === "string" && exam.imageUrl.trim()) {
    const customUrl = exam.imageUrl.trim();
    const isPng = customUrl.endsWith(".png");
    return {
      key: "custom",
      subjectName: exam.subject || "Bài thi",
      imageUrl: customUrl,
      imageAlt: exam.title ? exam.title.trim() : "Bài kiểm tra DkTEST",
      imageWidth: 1200,
      imageHeight: 630,
      mimeType: isPng ? "image/png" : "image/jpeg",
    };
  }

  const examQuery = {
    subject: exam?.subject,
    title: exam?.title,
    code: exam?.code,
    id: exam?.id || examId,
  };

  const detectedSubject = detectExamSubject(examQuery, "Tổng hợp");
  const bannerKey = getSubjectBannerKey(examQuery);
  const bannerInfo = SUBJECT_BANNER_MAP[bannerKey] || SUBJECT_BANNER_MAP.default;

  const imageUrl = `${cleanBase}/images/subjects/${bannerInfo.bannerFileName}`;
  const imageAlt = exam?.title && exam.title.trim()
    ? `${exam.title.trim()} — Môn ${bannerInfo.name} | DkTEST`
    : `Đề thi Môn ${bannerInfo.name} — DkTEST`;

  return {
    key: bannerKey,
    subjectName: bannerInfo.name,
    imageUrl,
    imageAlt,
    imageWidth: 1200,
    imageHeight: 630,
    mimeType: "image/jpeg",
  };
}
