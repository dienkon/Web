import { SCENARIO_BY_ID } from '../scenarios/catalog';
import { create } from 'zustand';
import type { CinematicId } from '../types';

type Point = [number, number, number];
export interface FilmShot { position: Point; target: Point; speaker: string; line: string }
export const FILMS: Record<'fire' | 'electrical' | 'fume' | 'evacuation', { title: string; shots: FilmShot[] }> = {
  fire: { title: 'Một phút bất cẩn', shots: [
    { position: [1.5, 2.4, 1], target: [4.2, 1.1, -2.2], speaker: 'Minh', line: 'Mình để chai dung môi ở đây rồi bật đèn đốt nhé…' },
    { position: [5.7, 1.65, -.7], target: [4.2, 1.15, -2.2], speaker: 'Lan', line: 'Khoan! Chai dung môi đang sát nguồn nhiệt. Tay áo của cậu vướng vào chai kìa!' },
    { position: [2.4, 1.7, -.6], target: [4.2, 1.05, -2.2], speaker: 'Lan', line: 'Dung môi đổ và bắt lửa! Mọi người lùi lại, báo động và gọi thầy ngay!' },
    { position: [1, 2.3, .7], target: [4.2, 1, -2.2], speaker: 'Giáo viên', line: 'Đây là tình huống mô phỏng có giám sát. Giữ lối thoát sau lưng. Chỉ dùng bình phù hợp khi đám cháy còn nhỏ và em đã được huấn luyện.' },
    { position: [1.8, 1.8, .5], target: [4.2, 1, -2.2], speaker: 'Thực hành P.A.S.S', line: 'Đã nhận bình CO₂. Rút chốt [R], ngắm gốc lửa, giữ chuột trái hoặc nút Phun và quét qua lại. Nếu không an toàn: rút lui, báo giáo viên.' },
  ] },
  electrical: { title: 'Nước và điện', shots: [
    { position: [-1.6, 2.1, -.4], target: [-4.2, 1, -2.2], speaker: 'Minh', line: 'Có nước ngay cạnh ổ cắm. Mình cắm máy khuấy vào luôn được không?' },
    { position: [-2.8, 1.6, -1], target: [-4.2, 1, -2.2], speaker: 'Lan', line: 'Dừng lại! Đừng chạm ổ cắm hay thiết bị khi khu vực đang ướt.' },
    { position: [-1.6, 2.1, -.4], target: [-4.2, 1, -2.2], speaker: 'Giáo viên', line: 'Cảnh báo mọi người, giữ khoảng cách và báo người phụ trách cô lập nguồn. Em hãy chọn trình tự xử lý an toàn.' },
  ] },
  fume: { title: 'Chiếc tủ hút đang mở', shots: [
    { position: [6.3, 2.2, -.2], target: [8.8, 1.2, -3.5], speaker: 'Minh', line: 'Mẫu có mùi lạ. Mình đưa sát mũi để nhận biết nhé?' },
    { position: [7, 1.7, -1.5], target: [8.8, 1.2, -3.5], speaker: 'Lan', line: 'Không ngửi trực tiếp! Mẫu chưa biết phải hỏi giáo viên và kiểm tra nhãn trước.' },
    { position: [6.3, 2.2, -.2], target: [8.8, 1.2, -3.5], speaker: 'Giáo viên', line: 'Kiểm tra luồng hút, vị trí cửa chắn và bố trí dụng cụ trước khi thao tác theo hướng dẫn.' },
  ] },
  evacuation: { title: 'Khi chuông báo động vang lên', shots: [
    { position: [0, 2.4, 3.8], target: [-6, 1.1, 6], speaker: 'Lan', line: 'Có báo động rồi! Mình quay lại lấy balô chứ?' },
    { position: [-3.7, 1.7, 4.8], target: [-6, 1.2, 6], speaker: 'Minh', line: 'Đừng quay lại. Đi theo lối thoát an toàn, không chen lấn!' },
    { position: [0, 2.4, 3.8], target: [-6, 1.1, 6], speaker: 'Giáo viên', line: 'Ra điểm tập kết, báo cáo sĩ số và người còn thiếu. Chỉ trở lại khi người phụ trách cho phép.' },
  ] },
};
export const SHOT_SECONDS = 4.5;
export const useFilmCaption = create<{ id: CinematicId | null; shot: number }>(() => ({ id: null, shot: 0 }));

export function resolveFilm(id: CinematicId): { title: string; shots: FilmShot[] } {
  if (id.startsWith('scenario:')) {
    const scenario = SCENARIO_BY_ID.get(id.slice(9));
    if (scenario) return {
      title: scenario.title,
      shots: scenario.dialogue.map((shot,index) => ({
        position: index===1?[
          scenario.position[0]+(shot.camera[0]-scenario.position[0])*.75,
          Math.max(2.05,scenario.position[1]+.95),
          scenario.position[2]+(shot.camera[2]-scenario.position[2])*.75,
        ] as Point:shot.camera,
        target: index===1?[scenario.position[0],scenario.position[1]+.12,scenario.position[2]] as Point:shot.target,
        speaker: shot.speaker,
        line: shot.line,
      })),
    };
  }
  return FILMS[id as keyof typeof FILMS] ?? FILMS.fire;
}
