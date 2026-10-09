/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Narrative Learning Campaigns & Graph Architecture Service
 * Ensures strict DAG validation (cycle detection), version-safe persistence,
 * and evidence-based node completion.
 */

import type {
  NarrativeCampaign,
  CampaignNode,
  StudentCampaignProgress,
  StudentCampaignNodeProgress,
} from "../types/campaign";
import type { SubjectThemeType } from "../types/journey3D";

const LOCAL_CAMPAIGNS_KEY = "dktest_campaigns_v1";
const LOCAL_CAMPAIGN_PROGRESS_KEY = "dktest_campaign_progress_v1";

export const BUILTIN_CAMPAIGNS: NarrativeCampaign[] = [
  {
    id: "camp_math_frontier",
    version: 1,
    title: "Vùng Đất Toán Học: Khảo Sát & Ứng Dụng Đạo Hàm",
    slug: "the-mathematics-frontier",
    description: "Thám hiểm kiến trúc giải tích, khám phá cực trị và hình học của các đường cong đại số.",
    narrativeIntro: "Chào mừng Nhà thám hiểm! Vùng đất Giải tích Lớp 12 đang chờ đón bạn. Hãy bắt đầu từ việc nắm vững tính đơn điệu, vượt qua thung lũng cực trị và tiến đến đỉnh tháp khảo sát đồ thị hàm số.",
    subject: "math",
    grade: 12,
    status: "published",
    createdAt: "2026-10-09T00:00:00.000Z",
    updatedAt: "2026-10-09T00:00:00.000Z",
    publishedAt: "2026-10-09T00:00:00.000Z",
    regions: [
      {
        id: "reg_math_1",
        name: "Đồng Bằng Đơn Điệu",
        description: "Khởi đầu nhận diện chiều biến thiên đồng biến và nghịch biến.",
        subject: "math",
        accentColor: "indigo",
      },
      {
        id: "reg_math_2",
        name: "Thung Lũng Cực Trị & Tiệm Cận",
        description: "Khám phá các điểm cực đại, cực tiểu và ranh giới vô tận của đường tiệm cận.",
        subject: "math",
        accentColor: "blue",
      },
      {
        id: "reg_math_3",
        name: "Đỉnh Tháp Khảo Sát Toàn Cảnh",
        description: "Hợp nhất kiến thức để đọc bảng biến thiên và vẽ hình dạng đồ thị.",
        subject: "math",
        accentColor: "emerald",
      },
    ],
    nodes: [
      {
        id: "node_m1_intro",
        title: "Cửa Ngõ: Tính Đơn Điệu Của Hàm Số",
        subtitle: "Khởi động hành trình",
        learningObjective: "Xét dấu đạo hàm bậc nhất f'(x) để xác định khoảng đồng biến, nghịch biến.",
        type: "story_intro",
        regionId: "reg_math_1",
        chapterName: "Chương 1: Ứng dụng đạo hàm",
        topicName: "Tính đơn điệu",
        prerequisiteNodeIds: [],
        isOptional: false,
        estimatedMinutes: 5,
        x: 15,
        y: 15,
        questionCount: 3,
        guideDialogue: "Hãy nhớ quy tắc then chốt: f'(x) >= 0 trên K thì hàm số đồng biến!",
      },
      {
        id: "node_m1_practice",
        title: "Thử Thách: Đọc Bảng Xét Dấu",
        learningObjective: "Phân tích bảng biến thiên của hàm bậc 3 và hàm phân thức cơ bản.",
        type: "practice_encounter",
        regionId: "reg_math_1",
        chapterName: "Chương 1: Ứng dụng đạo hàm",
        topicName: "Khoảng biến thiên",
        prerequisiteNodeIds: ["node_m1_intro"],
        isOptional: false,
        estimatedMinutes: 8,
        x: 35,
        y: 25,
        questionCount: 5,
      },
      {
        id: "node_m1_side_branch",
        title: "Góc Khám Phá: Hàm Số Chứa Tham Số m",
        subtitle: "Nhánh mở rộng tùy chọn",
        learningObjective: "Tìm điều kiện tham số m để hàm số luôn đồng biến trên R.",
        type: "optional_branch",
        regionId: "reg_math_1",
        chapterName: "Chương 1: Ứng dụng đạo hàm",
        topicName: "Tham số m đơn điệu",
        prerequisiteNodeIds: ["node_m1_practice"],
        isOptional: true,
        estimatedMinutes: 10,
        x: 35,
        y: 45,
        questionCount: 4,
        guideDialogue: "Nhánh này nâng cao hơn, bạn có thể hoàn thành hoặc đi thẳng tới Trạm Kiểm Soát!",
      },
      {
        id: "node_m2_checkpoint",
        title: "Trạm Kiểm Soát: Cực Trị & Tiệm Cận",
        subtitle: "Thử thách trung tâm",
        learningObjective: "Phân biệt cực đại, cực tiểu và tìm tiệm cận đứng, tiệm cận ngang.",
        type: "checkpoint",
        regionId: "reg_math_2",
        chapterName: "Chương 1: Ứng dụng đạo hàm",
        topicName: "Cực trị & Tiệm cận",
        prerequisiteNodeIds: ["node_m1_practice"],
        isOptional: false,
        estimatedMinutes: 12,
        x: 60,
        y: 35,
        questionCount: 8,
        passAccuracyThreshold: 70,
      },
      {
        id: "node_m3_final",
        title: "Pháo Đài Tối Cao: Nhận Diện Đồ Thị",
        subtitle: "Đỉnh cao chiến dịch",
        learningObjective: "Tổng hợp dấu hệ số a, c, tọa độ giao điểm và nghiệm đạo hàm để khớp đồ thị chuẩn.",
        type: "final_assessment",
        regionId: "reg_math_3",
        chapterName: "Chương 1: Ứng dụng đạo hàm",
        topicName: "Nhận dạng đồ thị",
        prerequisiteNodeIds: ["node_m2_checkpoint"],
        isOptional: false,
        estimatedMinutes: 15,
        x: 85,
        y: 60,
        questionCount: 10,
        passAccuracyThreshold: 75,
      },
    ],
  },
  {
    id: "camp_physics_expedition",
    version: 1,
    title: "Thám Hiểm Vật Lý: Nhịp Điệu Dao Động Cơ",
    slug: "the-physics-expedition",
    description: "Khám phá bản chất của dao động điều hòa, con lắc lò xo và con lắc đơn.",
    narrativeIntro: "Bạn đang đặt chân vào Thế giới Dao Động! Hãy vận dụng công thức chu kỳ, vận tốc và năng lượng để mở khóa cánh cổng sóng cơ học.",
    subject: "physics",
    grade: 12,
    status: "published",
    createdAt: "2026-10-09T00:00:00.000Z",
    updatedAt: "2026-10-09T00:00:00.000Z",
    publishedAt: "2026-10-09T00:00:00.000Z",
    regions: [
      {
        id: "reg_phys_1",
        name: "Phòng Thí Nghiệm Con Lắc",
        description: "Nơi nghiên cứu phương trình li độ x = A*cos(wt + phi).",
        subject: "physics",
        accentColor: "cyan",
      },
      {
        id: "reg_phys_2",
        name: "Trạm Năng Lượng Dao Động",
        description: "Bảo toàn cơ năng giữa thế năng và động năng.",
        subject: "physics",
        accentColor: "sky",
      },
    ],
    nodes: [
      {
        id: "node_p1_intro",
        title: "Khởi Đầu: Phương Trình Dao Động",
        learningObjective: "Xác định biên độ A, tần số góc omega và pha ban đầu phi.",
        type: "story_intro",
        regionId: "reg_phys_1",
        chapterName: "Chương 1: Dao động cơ",
        topicName: "Dao động điều hòa",
        prerequisiteNodeIds: [],
        isOptional: false,
        estimatedMinutes: 5,
        x: 20,
        y: 20,
        questionCount: 3,
      },
      {
        id: "node_p1_practice",
        title: "Thực Nghiệm: Vận Tốc & Gia Tốc",
        learningObjective: "Quan sát pha vuông góc giữa li độ và vận tốc, gia tốc ngược pha với li độ.",
        type: "practice_encounter",
        regionId: "reg_phys_1",
        chapterName: "Chương 1: Dao động cơ",
        topicName: "Vận tốc & gia tốc",
        prerequisiteNodeIds: ["node_p1_intro"],
        isOptional: false,
        estimatedMinutes: 8,
        x: 50,
        y: 40,
        questionCount: 5,
      },
      {
        id: "node_p2_final",
        title: "Thử Thách: Con Lắc Lò Xo & Con Lắc Đơn",
        learningObjective: "Tính chu kỳ T = 2pi*sqrt(m/k) và chu kỳ con lắc đơn T = 2pi*sqrt(l/g).",
        type: "final_assessment",
        regionId: "reg_phys_2",
        chapterName: "Chương 1: Dao động cơ",
        topicName: "Con lắc & Cơ năng",
        prerequisiteNodeIds: ["node_p1_practice"],
        isOptional: false,
        estimatedMinutes: 12,
        x: 80,
        y: 60,
        questionCount: 8,
        passAccuracyThreshold: 70,
      },
    ],
  },
  {
    id: "camp_chem_kingdom",
    version: 1,
    title: "Vương Quốc Hóa Học: Bí Ẩn Este & Lipit",
    slug: "the-chemical-kingdom",
    description: "Giải mã cấu trúc este, phản ứng thủy phân trong môi trường axit và kiềm (xà phòng hóa).",
    narrativeIntro: "Chào mừng tới Vương quốc Hợp chất Hữu cơ! Mùi hương thơm mát của este đang lan tỏa. Hãy giải mã các phản ứng hóa sinh tinh xảo.",
    subject: "chemistry",
    grade: 12,
    status: "published",
    createdAt: "2026-10-09T00:00:00.000Z",
    updatedAt: "2026-10-09T00:00:00.000Z",
    publishedAt: "2026-10-09T00:00:00.000Z",
    regions: [
      {
        id: "reg_chem_1",
        name: "Khu Vườn Mùi Hương Este",
        description: "Khám phá danh pháp và cấu tạo của este no, đơn chức.",
        subject: "chemistry",
        accentColor: "emerald",
      },
      {
        id: "reg_chem_2",
        name: "Lò Thủy Phân & Xà Phòng",
        description: "Thực hiện phản ứng este hóa thuận nghịch và phản ứng xà phòng hóa một chiều.",
        subject: "chemistry",
        accentColor: "teal",
      },
    ],
    nodes: [
      {
        id: "node_c1_intro",
        title: "Nhận Biết: Danh Pháp Este",
        learningObjective: "Đọc tên đúng các este thông dụng như etyl axetat, metyl fomat, benzyl axetat.",
        type: "story_intro",
        regionId: "reg_chem_1",
        chapterName: "Chương 1: Este - Lipit",
        topicName: "Cấu tạo & Tên gọi",
        prerequisiteNodeIds: [],
        isOptional: false,
        estimatedMinutes: 5,
        x: 20,
        y: 20,
        questionCount: 3,
      },
      {
        id: "node_c1_practice",
        title: "Thực Nghiệm: Phản Ứng Thủy Phân",
        learningObjective: "Viết phương trình thủy phân este trong dung dịch NaOH đun nóng tạo muối và ancol.",
        type: "practice_encounter",
        regionId: "reg_chem_1",
        chapterName: "Chương 1: Este - Lipit",
        topicName: "Phản ứng xà phòng hóa",
        prerequisiteNodeIds: ["node_c1_intro"],
        isOptional: false,
        estimatedMinutes: 8,
        x: 50,
        y: 45,
        questionCount: 5,
      },
      {
        id: "node_c2_final",
        title: "Đỉnh Cao: Bài Toán Thủy Phân & Đốt Cháy Este",
        learningObjective: "Vận dụng định luật bảo toàn khối lượng và tỉ lệ nCO2 : nH2O để xác định công thức phân tử este.",
        type: "final_assessment",
        regionId: "reg_chem_2",
        chapterName: "Chương 1: Este - Lipit",
        topicName: "Bài toán Este",
        prerequisiteNodeIds: ["node_c1_practice"],
        isOptional: false,
        estimatedMinutes: 12,
        x: 80,
        y: 70,
        questionCount: 8,
        passAccuracyThreshold: 70,
      },
    ],
  },
];

/**
 * Validates graph structure and detects cycles in prerequisites (DAG check)
 */
export function validateCampaignGraph(nodes: CampaignNode[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const nodeMap = new Map<string, CampaignNode>();

  for (const node of nodes) {
    if (nodeMap.has(node.id)) {
      errors.push(`Trùng lặp mã nút (ID): "${node.id}"`);
    }
    nodeMap.set(node.id, node);
  }

  // Check that all prerequisite IDs exist
  for (const node of nodes) {
    for (const prereqId of node.prerequisiteNodeIds) {
      if (!nodeMap.has(prereqId)) {
        errors.push(`Nút "${node.title}" trỏ tới tiên quyết không tồn tại: "${prereqId}"`);
      }
      if (prereqId === node.id) {
        errors.push(`Nút "${node.title}" không thể tự phụ thuộc vào chính nó.`);
      }
    }
  }

  // Cycle detection via DFS topological check
  const visited = new Map<string, "visiting" | "visited">();

  function hasCycle(nodeId: string, path: string[]): boolean {
    visited.set(nodeId, "visiting");
    const node = nodeMap.get(nodeId);
    if (node) {
      for (const nextPrereq of node.prerequisiteNodeIds) {
        const state = visited.get(nextPrereq);
        if (state === "visiting") {
          errors.push(
            `Phát hiện chu trình phụ thuộc vòng kín (Cycle): ${[...path, nodeId, nextPrereq].join(" -> ")}`
          );
          return true;
        }
        if (!state) {
          if (hasCycle(nextPrereq, [...path, nodeId])) return true;
        }
      }
    }
    visited.set(nodeId, "visited");
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      hasCycle(node.id, []);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Retrieves all campaigns (built-in + published admin custom campaigns)
 */
export function getAllCampaigns(): NarrativeCampaign[] {
  let customCampaigns: NarrativeCampaign[] = [];
  try {
    const raw = localStorage.getItem(LOCAL_CAMPAIGNS_KEY);
    if (raw) customCampaigns = JSON.parse(raw);
  } catch {}

  const merged = [...BUILTIN_CAMPAIGNS];
  for (const custom of customCampaigns) {
    const idx = merged.findIndex((c) => c.id === custom.id);
    if (idx >= 0) {
      merged[idx] = custom;
    } else {
      merged.push(custom);
    }
  }
  return merged;
}

export function getCampaignsBySubject(subject: SubjectThemeType): NarrativeCampaign[] {
  return getAllCampaigns().filter((c) => c.subject === subject);
}

export function getCampaignById(id: string): NarrativeCampaign | undefined {
  return getAllCampaigns().find((c) => c.id === id);
}

/**
 * Saves a new or edited campaign (draft/published)
 */
export function saveCustomCampaign(campaign: NarrativeCampaign): {
  success: boolean;
  errors: string[];
} {
  const validation = validateCampaignGraph(campaign.nodes);
  if (!validation.isValid) {
    return { success: false, errors: validation.errors };
  }

  try {
    let customCampaigns: NarrativeCampaign[] = [];
    const raw = localStorage.getItem(LOCAL_CAMPAIGNS_KEY);
    if (raw) customCampaigns = JSON.parse(raw);

    const idx = customCampaigns.findIndex((c) => c.id === campaign.id);
    if (idx >= 0) {
      customCampaigns[idx] = campaign;
    } else {
      customCampaigns.push(campaign);
    }
    localStorage.setItem(LOCAL_CAMPAIGNS_KEY, JSON.stringify(customCampaigns));
    return { success: true, errors: [] };
  } catch (err: any) {
    return { success: false, errors: [err.message || "Lỗi lưu chiến dịch"] };
  }
}

/**
 * Initializes or loads a student's progress in a given campaign
 */
export function getStudentCampaignProgress(
  studentUid: string,
  campaign: NarrativeCampaign
): StudentCampaignProgress {
  const storeKey = `${LOCAL_CAMPAIGN_PROGRESS_KEY}_${studentUid}_${campaign.id}`;
  let saved: StudentCampaignProgress | null = null;
  try {
    const raw = localStorage.getItem(storeKey);
    if (raw) saved = JSON.parse(raw);
  } catch {}

  const nodeProgress: Record<string, StudentCampaignNodeProgress> = {};
  let completedCount = 0;

  for (const node of campaign.nodes) {
    const existing = saved?.nodeProgress?.[node.id];
    // A node is unlocked if it has no prerequisites OR all prerequisites are completed
    const prereqsMet =
      node.prerequisiteNodeIds.length === 0 ||
      node.prerequisiteNodeIds.every((pid) => saved?.nodeProgress?.[pid]?.isCompleted);

    const isDone = !!existing?.isCompleted;
    if (isDone) completedCount++;

    nodeProgress[node.id] = {
      nodeId: node.id,
      isUnlocked: prereqsMet || isDone,
      isCompleted: isDone,
      completedAt: existing?.completedAt,
      bestAccuracy: existing?.bestAccuracy,
      attemptsCount: existing?.attemptsCount || 0,
    };
  }

  // Find current active node (first unlocked but not completed node)
  const currentNode =
    campaign.nodes.find((n) => nodeProgress[n.id]?.isUnlocked && !nodeProgress[n.id]?.isCompleted) ||
    campaign.nodes[campaign.nodes.length - 1];

  const result: StudentCampaignProgress = {
    campaignId: campaign.id,
    campaignVersion: campaign.version,
    studentUid,
    currentNodeId: currentNode.id,
    nodeProgress,
    completedNodeCount: completedCount,
    totalNodeCount: campaign.nodes.length,
    isCompleted: completedCount >= campaign.nodes.length,
    completedAt: saved?.completedAt,
    lastActiveAt: saved?.lastActiveAt || new Date().toISOString(),
  };

  return result;
}

/**
 * Marks a campaign node completed after verified learning performance
 */
export function recordCampaignNodeCompletion(params: {
  studentUid: string;
  campaign: NarrativeCampaign;
  nodeId: string;
  accuracy: number;
}): StudentCampaignProgress {
  const { studentUid, campaign, nodeId, accuracy } = params;
  const current = getStudentCampaignProgress(studentUid, campaign);
  const targetNode = campaign.nodes.find((n) => n.id === nodeId);
  if (!targetNode) return current;

  const nowIso = new Date().toISOString();
  const existingNode = current.nodeProgress[nodeId] || {
    nodeId,
    isUnlocked: true,
    isCompleted: false,
    attemptsCount: 0,
  };

  const newAttempts = existingNode.attemptsCount + 1;
  const bestAcc = Math.max(existingNode.bestAccuracy || 0, accuracy);

  // Require passing threshold if configured
  const threshold = targetNode.passAccuracyThreshold || 50;
  const passed = accuracy >= threshold;

  const updatedNodeProgress: StudentCampaignNodeProgress = {
    ...existingNode,
    isUnlocked: true,
    isCompleted: existingNode.isCompleted || passed,
    completedAt: existingNode.completedAt || (passed ? nowIso : undefined),
    bestAccuracy: bestAcc,
    attemptsCount: newAttempts,
  };

  const nextNodeProgress = {
    ...current.nodeProgress,
    [nodeId]: updatedNodeProgress,
  };

  // Recalculate unlocks
  let completedCount = 0;
  for (const node of campaign.nodes) {
    if (nextNodeProgress[node.id]?.isCompleted) {
      completedCount++;
    }
  }

  for (const node of campaign.nodes) {
    const prereqsMet =
      node.prerequisiteNodeIds.length === 0 ||
      node.prerequisiteNodeIds.every((pid) => nextNodeProgress[pid]?.isCompleted);
    if (prereqsMet && !nextNodeProgress[node.id].isUnlocked) {
      nextNodeProgress[node.id] = {
        ...nextNodeProgress[node.id],
        isUnlocked: true,
      };
    }
  }

  const allDone = completedCount >= campaign.nodes.length;

  const updatedProgress: StudentCampaignProgress = {
    ...current,
    nodeProgress: nextNodeProgress,
    completedNodeCount: completedCount,
    isCompleted: allDone,
    completedAt: current.completedAt || (allDone ? nowIso : undefined),
    lastActiveAt: nowIso,
  };

  try {
    const storeKey = `${LOCAL_CAMPAIGN_PROGRESS_KEY}_${studentUid}_${campaign.id}`;
    localStorage.setItem(storeKey, JSON.stringify(updatedProgress));
  } catch {}

  return updatedProgress;
}
