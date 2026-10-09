/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Knowledge Constellation Graph Service
 * Maps educational relationships (prerequisites, extensions, common confusions)
 * between topics in High-School Math, Physics, and Chemistry.
 */

import type { SubjectThemeType } from "../types/journey3D";
import type {
  KnowledgeGraphData,
  KnowledgeNode,
  KnowledgeEdge,
} from "../types/knowledgeConstellation";

export const MASTER_KNOWLEDGE_GRAPH: KnowledgeGraphData = {
  nodes: [
    // MATH
    {
      id: "kn_m_don_dieu",
      code: "M12-C1-01",
      label: "Tính Đơn Điệu Hàm Số",
      subject: "math",
      chapter: "Ứng dụng đạo hàm",
      learningObjectives: ["Quy tắc xét dấu f'(x)", "Khoảng đồng biến - nghịch biến"],
      cognitiveLevel: "nhan_biet",
      practiceRoute: "/student/practice/custom_topic?topic=Tính%20đơn%20điệu",
      x: 15,
      y: 20,
    },
    {
      id: "kn_m_cuc_tri",
      code: "M12-C1-02",
      label: "Cực Trị Hàm Số",
      subject: "math",
      chapter: "Ứng dụng đạo hàm",
      learningObjectives: ["Điều kiện cần và đủ để đạt cực trị", "Cực trị hàm bậc 3 và bậc 4 trùng phương"],
      cognitiveLevel: "thong_hieu",
      practiceRoute: "/student/practice/custom_topic?topic=Cực%20trị",
      x: 35,
      y: 20,
    },
    {
      id: "kn_m_tiem_can",
      code: "M12-C1-03",
      label: "Đường Tiệm Cận",
      subject: "math",
      chapter: "Ứng dụng đạo hàm",
      learningObjectives: ["Tiệm cận đứng x = x0", "Tiệm cận ngang y = y0 khi x -> vô cùng"],
      cognitiveLevel: "nhan_biet",
      practiceRoute: "/student/practice/custom_topic?topic=Tiệm%20cận",
      x: 55,
      y: 20,
    },
    {
      id: "kn_m_khao_sat",
      code: "M12-C1-04",
      label: "Khảo Sát & Nhận Dạng Đồ Thị",
      subject: "math",
      chapter: "Ứng dụng đạo hàm",
      learningObjectives: ["Đọc bảng biến thiên", "Khớp hệ số đồ thị hàm phân thức"],
      cognitiveLevel: "van_dung",
      practiceRoute: "/student/practice/custom_topic?topic=Đồ%20thị",
      x: 75,
      y: 20,
    },
    {
      id: "kn_m_nguyen_ham",
      code: "M12-C3-01",
      label: "Nguyên Hàm & Tích Phân",
      subject: "math",
      chapter: "Nguyên hàm - Tích phân",
      learningObjectives: ["Bảng nguyên hàm cơ bản", "Phương pháp đổi biến số & từng phần"],
      cognitiveLevel: "thong_hieu",
      practiceRoute: "/student/practice/custom_topic?topic=Nguyên%20hàm",
      x: 35,
      y: 55,
    },
    {
      id: "kn_m_dien_tich",
      code: "M12-C3-02",
      label: "Ứng Dụng Tích Phân Tính Diện Tích & Thể Tích",
      subject: "math",
      chapter: "Nguyên hàm - Tích phân",
      learningObjectives: ["Công thức tính diện tích hình phẳng giới hạn bởi 2 đường cong"],
      cognitiveLevel: "van_dung",
      practiceRoute: "/student/practice/custom_topic?topic=Ứng%20dụng%20tích%20phân",
      x: 65,
      y: 55,
    },

    // PHYSICS
    {
      id: "kn_p_dao_dong",
      code: "P12-C1-01",
      label: "Dao Động Điều Hòa",
      subject: "physics",
      chapter: "Dao động cơ",
      learningObjectives: ["Phương trình x = A cos(wt + phi)", "Vận tốc, gia tốc, năng lượng"],
      cognitiveLevel: "nhan_biet",
      practiceRoute: "/student/practice/custom_topic?topic=Dao%20động%20điều%20hòa",
      x: 20,
      y: 35,
    },
    {
      id: "kn_p_con_lac",
      code: "P12-C1-02",
      label: "Con Lắc Lò Xo & Con Lắc Đơn",
      subject: "physics",
      chapter: "Dao động cơ",
      learningObjectives: ["Chu kỳ dao động T", "Lực kéo về và thế năng đàn hồi"],
      cognitiveLevel: "thong_hieu",
      practiceRoute: "/student/practice/custom_topic?topic=Con%20lắc",
      x: 45,
      y: 35,
    },
    {
      id: "kn_p_song_co",
      code: "P12-C2-01",
      label: "Sóng Cơ & Giao Thoa Sóng",
      subject: "physics",
      chapter: "Sóng cơ",
      learningObjectives: ["Bước sóng lambda = v*T", "Điều kiện cực đại, cực tiểu giao thoa"],
      cognitiveLevel: "van_dung",
      practiceRoute: "/student/practice/custom_topic?topic=Giao%20thoa%20sóng",
      x: 75,
      y: 35,
    },

    // CHEMISTRY
    {
      id: "kn_c_este",
      code: "C12-C1-01",
      label: "Este: Cấu Tạo & Danh Pháp",
      subject: "chemistry",
      chapter: "Este - Lipit",
      learningObjectives: ["Công thức chung RCOOR'", "Gọi tên gốc hiđrocacbon và axit"],
      cognitiveLevel: "nhan_biet",
      practiceRoute: "/student/practice/custom_topic?topic=Este",
      x: 20,
      y: 40,
    },
    {
      id: "kn_c_thuy_phan",
      code: "C12-C1-02",
      label: "Phản Ứng Thủy Phân Este & Xà Phòng Hóa",
      subject: "chemistry",
      chapter: "Este - Lipit",
      learningObjectives: ["Thủy phân trong môi trường axit (thuận nghịch) và môi trường kiềm"],
      cognitiveLevel: "thong_hieu",
      practiceRoute: "/student/practice/custom_topic?topic=Xà%20phòng%20hóa",
      x: 50,
      y: 40,
    },
    {
      id: "kn_c_lipit",
      code: "C12-C1-03",
      label: "Chất Béo & Phản Ứng Xà Phòng",
      subject: "chemistry",
      chapter: "Este - Lipit",
      learningObjectives: ["Trieste của glixerol với axit béo", "Chỉ số xà phòng hóa & bài toán chất béo"],
      cognitiveLevel: "van_dung",
      practiceRoute: "/student/practice/custom_topic?topic=Chất%20béo",
      x: 80,
      y: 40,
    },
  ],
  edges: [
    // MATH EDGES
    {
      id: "ed_m_1",
      sourceNodeId: "kn_m_don_dieu",
      targetNodeId: "kn_m_cuc_tri",
      relationship: "prerequisite_for",
      description: "Hiểu biến thiên dấu f'(x) là nền tảng xác định điểm cực trị.",
    },
    {
      id: "ed_m_2",
      sourceNodeId: "kn_m_cuc_tri",
      targetNodeId: "kn_m_khao_sat",
      relationship: "applied_in",
      description: "Cực trị là tọa độ đỉnh uốn cong trên đồ thị hàm số.",
    },
    {
      id: "ed_m_3",
      sourceNodeId: "kn_m_tiem_can",
      targetNodeId: "kn_m_khao_sat",
      relationship: "prerequisite_for",
      description: "Đường tiệm cận định hình khung bao ngoài của đồ thị.",
    },
    {
      id: "ed_m_4",
      sourceNodeId: "kn_m_khao_sat",
      targetNodeId: "kn_m_dien_tich",
      relationship: "applied_in",
      description: "Hình dạng đồ thị xác định ranh giới tích phân tính diện tích.",
    },
    {
      id: "ed_m_5",
      sourceNodeId: "kn_m_nguyen_ham",
      targetNodeId: "kn_m_dien_tich",
      relationship: "prerequisite_for",
      description: "Kỹ năng tính nguyên hàm là tiên quyết để tính tích phân.",
    },
    {
      id: "ed_m_6",
      sourceNodeId: "kn_m_don_dieu",
      targetNodeId: "kn_m_tiem_can",
      relationship: "related_to",
      description: "Cả hai đều dùng giới hạn và đạo hàm phân tích dáng điệu hàm số.",
    },

    // PHYSICS EDGES
    {
      id: "ed_p_1",
      sourceNodeId: "kn_p_dao_dong",
      targetNodeId: "kn_p_con_lac",
      relationship: "prerequisite_for",
      description: "Phương trình điều hòa là cơ sở thiết lập định luật cho con lắc.",
    },
    {
      id: "ed_p_2",
      sourceNodeId: "kn_p_dao_dong",
      targetNodeId: "kn_p_song_co",
      relationship: "extends",
      description: "Sóng cơ là sự lan truyền của dao động điều hòa qua môi trường đàn hồi.",
    },

    // CHEMISTRY EDGES
    {
      id: "ed_c_1",
      sourceNodeId: "kn_c_este",
      targetNodeId: "kn_c_thuy_phan",
      relationship: "prerequisite_for",
      description: "Nắm vững công thức cấu tạo trước khi xét cơ chế phản ứng bẻ gãy liên kết C-O.",
    },
    {
      id: "ed_c_2",
      sourceNodeId: "kn_c_thuy_phan",
      targetNodeId: "kn_c_lipit",
      relationship: "applied_in",
      description: "Phản ứng xà phòng hóa este được áp dụng trực tiếp cho triglixerit.",
    },
  ],
};

export function getKnowledgeGraph(subject?: SubjectThemeType): KnowledgeGraphData {
  if (!subject) return MASTER_KNOWLEDGE_GRAPH;
  const nodes = MASTER_KNOWLEDGE_GRAPH.nodes.filter((n) => n.subject === subject);
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = MASTER_KNOWLEDGE_GRAPH.edges.filter(
    (e) => nodeIds.has(e.sourceNodeId) && nodeIds.has(e.targetNodeId)
  );
  return { nodes, edges };
}

export function searchKnowledgeNodes(query: string, subject?: SubjectThemeType): KnowledgeNode[] {
  const baseNodes = subject
    ? MASTER_KNOWLEDGE_GRAPH.nodes.filter((n) => n.subject === subject)
    : MASTER_KNOWLEDGE_GRAPH.nodes;

  if (!query.trim()) return baseNodes;
  const clean = query.toLowerCase().trim();

  return baseNodes.filter(
    (n) =>
      n.label.toLowerCase().includes(clean) ||
      n.code.toLowerCase().includes(clean) ||
      n.chapter.toLowerCase().includes(clean) ||
      n.learningObjectives.some((obj) => obj.toLowerCase().includes(clean))
  );
}
