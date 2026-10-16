import type {
  LessonCondition,
  LessonConditionResult,
  LessonDefinition,
  LessonEnvironment,
} from '../types';

export function createLessonEnvironment(): LessonEnvironment {
  return {
    pressure_bar: 1,
    temperature_c: 25,
    targetTemperature_c: 25,
    pH: 7,
    mixed: false,
    stirring: false,
    catalysts: [],
    enzymes: [],
    ignition: false,
    industrial: false,
    oxygenAvailable: true,
    vented: true,
  };
}

function insideRange(value: number, condition: LessonCondition): boolean {
  const minimum = condition.minimum ?? -Infinity;
  const maximum = condition.maximum ?? Infinity;
  return value >= minimum && value <= maximum;
}

export function evaluateLessonCondition(
  condition: LessonCondition,
  environment: LessonEnvironment,
): LessonConditionResult {
  let satisfied = false;
  let message = condition.label_vi;
  switch (condition.kind) {
    case 'pressure':
      satisfied = insideRange(environment.pressure_bar, condition);
      message = `${condition.label_vi}; hiện tại ${environment.pressure_bar.toFixed(1)} bar.`;
      break;
    case 'mixed':
      satisfied = environment.mixed;
      message = satisfied ? 'Các mẫu đã tiếp xúc.' : 'Cho các mẫu tiếp xúc để bắt đầu.';
      break;
    case 'temperature':
      satisfied = insideRange(environment.temperature_c, condition);
      message = satisfied
        ? `Đã đạt nhiệt độ của kịch bản: ${environment.temperature_c.toFixed(1)} °C.`
        : `${condition.label_vi}; hiện tại ${environment.temperature_c.toFixed(1)} °C.`;
      break;
    case 'catalyst':
      satisfied = environment.catalysts.includes(condition.value ?? '');
      message = satisfied ? `Đã chọn xúc tác ${condition.value}.` : condition.label_vi;
      break;
    case 'enzyme':
      satisfied = environment.enzymes.includes(condition.value ?? '');
      message = satisfied ? 'Đã chọn enzym của kịch bản.' : condition.label_vi;
      break;
    case 'ignition':
      satisfied = environment.ignition;
      message = satisfied ? 'Đã cấp nguồn mồi ảo.' : 'Cần nguồn mồi ảo; không tự cháy chỉ do trộn.';
      break;
    case 'acidic':
      satisfied = environment.pH <= (condition.maximum ?? 4);
      message = satisfied ? 'Môi trường axit đã được thiết lập.' : condition.label_vi;
      break;
    case 'alkaline':
      satisfied = environment.pH >= (condition.minimum ?? 10);
      message = satisfied ? 'Môi trường kiềm đã được thiết lập.' : condition.label_vi;
      break;
    case 'industrial':
      satisfied = environment.industrial;
      message = satisfied ? 'Đang dùng kịch bản điều kiện công nghiệp.' : condition.label_vi;
      break;
    case 'oxygen':
      satisfied = environment.oxygenAvailable;
      message = satisfied ? 'Mô hình có nguồn O2.' : 'Chưa có nguồn O2 cho phản ứng cháy hoàn toàn.';
      break;
  }
  return {
    condition,
    satisfied,
    message_vi: message,
  };
}

export function evaluateLessonConditions(
  definition: LessonDefinition,
  environment: LessonEnvironment,
): LessonConditionResult[] {
  return definition.conditions.map(condition => evaluateLessonCondition(condition, environment));
}

export function lessonConditionsReady(results: LessonConditionResult[]): boolean {
  return results.every(result => result.satisfied);
}

export function advanceLessonTemperature(environment: LessonEnvironment, dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0) return;
  const target = Math.max(0, Math.min(1100, environment.targetTemperature_c));
  const response = 1 - Math.exp(-dt / 1.8);
  environment.temperature_c += (target - environment.temperature_c) * response;
  if (Math.abs(target - environment.temperature_c) < 0.25) {
    environment.temperature_c = target;
  }
}

export function toggleLessonList(values: string[], value: string, active: boolean): string[] {
  if (!value || value.length > 80) return values;
  if (active) return values.includes(value) ? values : [...values, value];
  return values.filter(entry => entry !== value);
}

export function conditionControlValue(condition: LessonCondition): number | string | boolean {
  switch (condition.kind) {
    case 'pressure':
    case 'temperature':
      return condition.minimum !== undefined && condition.maximum !== undefined
        ? (condition.minimum + condition.maximum) / 2
        : condition.minimum !== undefined ? condition.minimum + 5 : 25;
    case 'acidic':
      return Math.min(3, condition.maximum ?? 3);
    case 'alkaline':
      return Math.max(11, condition.minimum ?? 11);
    case 'catalyst':
    case 'enzyme':
      return condition.value ?? '';
    default:
      return true;
  }
}

export function describeLessonEnvironment(environment: LessonEnvironment): string[] {
  const values = [
    `${environment.temperature_c.toFixed(1)} °C`,
    `pH điều kiện: ${environment.pH.toFixed(1)}`,
    environment.mixed ? 'Đã trộn' : 'Chưa trộn',
    environment.stirring ? 'Đang khuấy' : 'Không khuấy',
    environment.vented ? 'Có đường thoát khí' : 'Giữ khí trong mô hình',
  ];
  if (environment.catalysts.length) values.push(`Xúc tác: ${environment.catalysts.join(', ')}`);
  if (environment.enzymes.length) values.push(`Enzym: ${environment.enzymes.join(', ')}`);
  if (environment.industrial) values.push('Điều kiện công nghiệp giản lược');
  return values;
}
