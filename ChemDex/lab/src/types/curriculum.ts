export interface ExperimentQuiz {
  questionVi: string;
  optionsVi: string[];
  correctIndex: number;
  explanationVi: string;
}

export interface ExperimentStep {
  stepNumber: number;
  titleVi: string;
  instructionVi: string;
  hintVi?: string;
  expectedChemicalId?: string;
  expectedVesselType?: string;
  expectedAction?: string;
  isCompleted?: boolean;
}

export interface ExperimentGuide {
  id: string;
  titleVi: string;
  categoryVi: string; // 'Axit - Bazơ' | 'Chuẩn độ' | 'Kết tủa' | 'Khí' | 'Oxi hóa - Khử' | 'Nhiệt hóa học'
  descriptionVi: string;
  objectiveVi: string;
  theoryVi: string;
  requiredApparatusVi: string[];
  requiredChemicalsVi: string[];
  steps: ExperimentStep[];
  quiz: ExperimentQuiz[];
}
