export interface FundamentalPrinciple {
  name: string;
  formulation: string;
}

export interface ConceptEquation {
  equation: string;
  phases: Record<string, string>;
  conditions: string;
  observation: string;
  historicalNote: string;
}

export interface SelfTestQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface CurriculumConcept {
  id: string;
  topic: string;
  grade: string;
  title: string;
  curriculumUnits: string[];
  summary: string;
  detailedExplanation: string;
  fundamentalPrinciples: FundamentalPrinciple[];
  keyEquationsAndPhenomena: ConceptEquation[];
  commonMisconceptions: string[];
  relatedElements: string[];
  relatedCompounds: string[];
  selfTestQuestions: SelfTestQuestion[];
}

export declare const curriculumConcepts: CurriculumConcept[];
export declare function getAllConcepts(): CurriculumConcept[];
export declare function getConceptById(id: string): CurriculumConcept | undefined;
export declare function getConceptsByGrade(grade: string | number): CurriculumConcept[];
export declare function getConceptsByTopic(topic: string): CurriculumConcept[];
export declare function getConceptsForSubstance(symbolOrFormula: string): CurriculumConcept[];
export declare function searchConcepts(query: string): CurriculumConcept[];
