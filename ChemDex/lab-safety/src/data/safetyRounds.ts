import type { CinematicId } from '../types';

export interface SafetyStep { prompt: string; options: string[]; correct: number; explanation: string }
export interface SafetyRound {
  id: string; title: string; position: [number, number, number]; cinematic: CinematicId; color: string; steps: SafetyStep[];
}
export const SAFETY_ROUNDS: SafetyRound[] = [
  { id: 'task_electrical_safety', title: 'Vòng 4 · Nước cạnh thiết bị điện', position: [-4.2, 1, -1.35], cinematic: 'electrical', color: '#fbbf24', steps: [
    { prompt: 'Em nhìn thấy nước cạnh ổ cấp nguồn. Việc đầu tiên là gì?', options: ['Lau ngay khi thiết bị vẫn đang cắm điện', 'Dừng sử dụng, cảnh báo người xung quanh và báo giáo viên', 'Rút phích bằng tay đang ướt'], correct: 1, explanation: 'Tránh tiếp xúc với nước, thiết bị và ổ điện. Để người phụ trách cô lập nguồn an toàn.' },
    { prompt: 'Ai xử lý việc cô lập và kiểm tra nguồn điện?', options: ['Tự tháo ổ cắm để xem', 'Nhờ bạn giữ dây điện', 'Giáo viên hoặc người có trách nhiệm, đủ năng lực'], correct: 2, explanation: 'Học sinh giữ khoảng cách; người phụ trách xử lý nguồn trước khi cho phép dọn khu vực.' },
    { prompt: 'Khi nào được sử dụng lại thiết bị?', options: ['Khi người phụ trách xác nhận nguồn, dây dẫn và khu vực đã an toàn', 'Ngay khi nước không còn nhìn thấy', 'Sau khi quấn băng dính quanh dây'], correct: 0, explanation: 'Thiết bị phải được kiểm tra. Không dùng dây hỏng hoặc tự sửa điện trong phòng học.' },
  ] },
  { id: 'task_fume_safety', title: 'Vòng 5 · Hơi hóa chất và tủ hút', position: [8.8, 1.1, -2.5], cinematic: 'fume', color: '#22d3ee', steps: [
    { prompt: 'Mẫu có mùi lạ nhưng chưa rõ thành phần. Em làm gì?', options: ['Ngửi sát miệng chai để xác định', 'Đọc nhãn, báo giáo viên và kiểm tra hướng dẫn an toàn', 'Trộn thêm hóa chất để thử phản ứng'], correct: 1, explanation: 'Không nếm hay ngửi trực tiếp. Mẫu chưa biết cần được giáo viên xác định trước khi xử lý.' },
    { prompt: 'Trước khi thao tác trong tủ hút cần kiểm tra gì?', options: ['Chỉ cần bật đèn', 'Mở cửa chắn cao nhất có thể', 'Luồng hút hoạt động và cửa chắn ở mức được hướng dẫn'], correct: 2, explanation: 'Tủ hút phải hoạt động đúng. Giữ cửa chắn ở mức quy định và không đưa đầu vào trong tủ.' },
    { prompt: 'Bố trí chai và dụng cụ trong tủ hút như thế nào?', options: ['Theo vạch làm việc, không chắn khe hút; đóng chai khi xong', 'Sát mép ngoài để dễ lấy', 'Chất kín tủ để cất toàn bộ hóa chất'], correct: 0, explanation: 'Giữ vùng thao tác thông thoáng. Tủ hút không thay thế tủ lưu trữ hóa chất.' },
  ] },
  { id: 'task_evacuation', title: 'Vòng 6 · Báo động và sơ tán', position: [-6, 1, 5.5], cinematic: 'evacuation', color: '#34d399', steps: [
    { prompt: 'Chuông báo động vang lên. Em cần làm gì?', options: ['Quay lại lấy balô rồi đi', 'Dừng thao tác và đi theo hướng dẫn đến lối thoát an toàn', 'Chờ xem bạn khác có đi không'], correct: 1, explanation: 'Ưu tiên rời vùng nguy hiểm. Không trì hoãn sơ tán để thu dọn đồ hay cứu thiết bị.' },
    { prompt: 'Lối thoát thường dùng có khói hoặc bị chặn?', options: ['Cố chạy xuyên qua', 'Trốn sau tủ hóa chất', 'Báo giáo viên, dùng lối thay thế an toàn theo hướng dẫn'], correct: 2, explanation: 'Không đi vào khói. Theo biển thoát nạn và hướng dẫn của người phụ trách.' },
    { prompt: 'Sau khi ra ngoài, em đi đâu?', options: ['Đến điểm tập kết, điểm danh và báo người còn thiếu', 'Về nhà luôn', 'Quay vào tìm bạn'], correct: 0, explanation: 'Ở lại điểm tập kết. Báo vị trí người còn thiếu cho lực lượng có trách nhiệm; không tự quay lại.' },
  ] },
];
