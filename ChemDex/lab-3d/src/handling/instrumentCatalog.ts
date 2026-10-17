import type { ToolPosition } from './toolDock';
import { LAB_PHYSICS } from '../engine/interactionEngine';
import { restingToolHeight } from './handheldRest';

export type InstrumentId =
  | 'pipette'
  | 'burette'
  | 'balance'
  | 'thermometer'
  | 'ph_meter'
  | 'stirring_rod'
  | 'spatula'
  | 'sponge';

export interface InstrumentDefinition {
  id: InstrumentId;
  name: string;
  home: ToolPosition;
  description: string;
  instructions: string[];
  unit: string;
  targetRequired: boolean;
  allowsLesson: boolean;
}

export const INSTRUMENTS: InstrumentDefinition[] = [
  {
    id: 'pipette',
    name: 'Pipet 10 mL',
    home: [-6.5, restingToolHeight('pipette', 0.4), 2],
    description: 'Hút và chuyển một phần dung dịch, giữ nguyên tỉ lệ các chất tan.',
    instructions: [
      'Chọn bình nguồn có dung dịch rồi nhấn Hút.',
      'Chọn bình nhận và đặt thể tích cần nhả.',
      'Mẫu giữ trong pipet khi đổi bình hoặc đổi công cụ.',
      'Chất rắn đã lắng không được hút theo dung dịch.',
    ],
    unit: 'mL',
    targetRequired: true,
    allowsLesson: false,
  },
  {
    id: 'burette',
    name: 'Buret',
    home: [...LAB_PHYSICS.BURETTE_STAND_POSITION],
    description: 'Nhả từng giọt theo nồng độ và thể tích thực tế trong mô hình.',
    instructions: [
      'Đặt bình nhận ngay dưới đầu buret bằng nút Căn bình.',
      'Một giọt của mô hình có thể tích tối đa 0,05 mL.',
      'Khóa mở liên tục chỉ nhả khi có bình nhận bên dưới.',
      'Bình đầy hoặc buret hết dung dịch sẽ dừng nhả.',
    ],
    unit: 'mL',
    targetRequired: true,
    allowsLesson: false,
  },
  {
    id: 'balance',
    name: 'Cân điện tử',
    home: [...LAB_PHYSICS.BALANCE_POSITION],
    description: 'Cân cả vỏ bình và lượng vật chất còn trong bình.',
    instructions: [
      'Đặt bình lên đĩa cân hoặc dùng nút Đặt lên cân.',
      'TARE lấy khối lượng hiện tại làm mốc không.',
      'Khi bỏ vật đã trừ bì ra, số đo có thể âm.',
      'Mẫu bài học có dung môi nền minh họa 50 g.',
    ],
    unit: 'g',
    targetRequired: false,
    allowsLesson: true,
  },
  {
    id: 'thermometer',
    name: 'Nhiệt kế',
    home: [-7.8, restingToolHeight('thermometer', 0.4), 2],
    description: 'Theo dõi nhiệt độ bình; đầu đo cần thời gian để ổn định.',
    instructions: [
      'Chọn bình cần đo rồi kích hoạt nhiệt kế.',
      'Đầu đo di chuyển đến bình đang chọn.',
      'Số đọc 3D tiến dần đến nhiệt độ của mẫu.',
      'Giá trị ở bảng là trạng thái nhiệt hiện tại của mô hình.',
    ],
    unit: '°C',
    targetRequired: true,
    allowsLesson: true,
  },
  {
    id: 'ph_meter',
    name: 'Máy đo pH',
    home: [-2.5, restingToolHeight('ph_meter', 0.4), 2],
    description: 'Đầu đo pH cho pha dung dịch; đầu đo khô không có số đọc hợp lệ.',
    instructions: [
      'Chọn bình có pha dung dịch rồi kích hoạt đầu đo.',
      'Đầu đo khô hiển thị --- thay vì mặc định pH 7.',
      'Chờ số đọc 3D ổn định sau khi chuyển bình.',
      'Trong bài học, pH là điều kiện kịch bản do người học đặt.',
    ],
    unit: 'pH',
    targetRequired: true,
    allowsLesson: true,
  },
  {
    id: 'stirring_rod',
    name: 'Đũa thủy tinh',
    home: [-5.2, restingToolHeight('stirring_rod', 0.4), 2],
    description: 'Khuấy bình đang chọn và theo dõi nguy cơ nhiễm chéo.',
    instructions: [
      'Kích hoạt rồi di chuột để khuấy thủ công trong cảnh.',
      'Có thể dùng nút Khuấy để thao tác bằng bàn phím.',
      'Trong bài học, nút bật/tắt tác động trực tiếp đến điều kiện khuấy.',
      'Rửa đũa khi đổi sang mẫu có thành phần khác.',
    ],
    unit: '',
    targetRequired: true,
    allowsLesson: true,
  },
  {
    id: 'spatula',
    name: 'Thìa lấy hóa chất',
    home: [-3.8, restingToolHeight('spatula', 0.4), 2],
    description: 'Chuyển lượng chất rắn đã lấy từ kho hóa chất vào bình.',
    instructions: [
      'Lấy hóa chất rắn trong danh sách hóa chất trước.',
      'Chọn bình nhận rồi dùng nút Cho mẫu vào bình.',
      'Khối lượng đưa vào bằng khối lượng đang có trên thìa.',
      'Không tự tạo một hóa chất mặc định khi thìa rỗng.',
    ],
    unit: 'g',
    targetRequired: true,
    allowsLesson: false,
  },
  {
    id: 'sponge',
    name: 'Miếng lau bàn',
    home: [0, -0.9, 3],
    description: 'Thu gom chất tràn trên bàn vào sổ khối lượng chất thải.',
    instructions: [
      'Kích hoạt miếng lau để làm sạch vùng chất tràn.',
      'Nút Thu gom tất cả xử lý toàn bộ vết tràn đang có.',
      'Khối lượng thu gom được chuyển sang khối lượng chất thải.',
      'Mẫu trong bình không bị xóa khi lau bàn.',
    ],
    unit: 'g',
    targetRequired: false,
    allowsLesson: true,
  },
];

export function getInstrument(id: InstrumentId): InstrumentDefinition {
  const instrument = INSTRUMENTS.find(entry => entry.id === id);
  if (!instrument) throw new Error(`Unknown instrument: ${id}`);
  return instrument;
}

export function isLessonVessel(id: string | null | undefined): boolean {
  return Boolean(id?.startsWith('lesson_vessel_'));
}

export function instrumentHome(id: InstrumentId): ToolPosition {
  const home = getInstrument(id).home;
  return [home[0], restingToolHeight(id, home[1]), home[2]];
}
