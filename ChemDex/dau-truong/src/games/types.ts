// src/games/types.ts
// Định nghĩa kiểu dữ liệu thống nhất cho toàn bộ hệ thống trò chơi (Game Registry)

import { ComponentType } from 'react';
import { TimeConfig } from '../config/gameConfig';

export type SubjectKind = 'chemistry' | 'math' | 'physics' | 'science' | 'mixed';

export type InputMode = 'text' | 'number' | 'choice' | 'coefficients';

export interface GameModuleInfo {
  id: string;
  name: string;
  shortName: string;
  subject: SubjectKind;
  subjectName: string;
  grade: number[];
  icon: string;
  badgeColor: string;
  description: string;
  inputType: InputMode;
  timeConfig: TimeConfig;
  validateAnswer: (question: any, userAnswer: any) => boolean;
  Component?: ComponentType<any>;
}
