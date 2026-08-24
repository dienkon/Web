import { PracticeMode } from "../core/types";

// Group A: Arithmetic
import { additionBasicMode } from "./arithmetic/additionBasic";
import { subtractionBasicMode } from "./arithmetic/subtractionBasic";
import { multiplicationBasicMode } from "./arithmetic/multiplicationBasic";
import { divisionBasicMode } from "./arithmetic/divisionBasic";
import { missingNumberMode } from "./arithmetic/missingNumber";
import { missingFactorMode } from "./arithmetic/missingFactor";

// Group B: Speed & Challenges
import { speed60sMode } from "./speed/speed60s";
import { comboStreakMode } from "./speed/comboStreak";
import { scoreConquestMode } from "./speed/scoreConquest";
import { survival3HeartsMode } from "./speed/survival3Hearts";

// Group C: Expressions
import { evaluateExpressionMode } from "./expressions/evaluateExpression";
import { parenthesesExpressionMode } from "./expressions/parenthesesExpression";
import { chooseCorrectExpressionMode } from "./expressions/chooseCorrectExpression";
import { expressionTarget24Mode } from "./expressions/expressionTarget24";
import { findExpressionErrorMode } from "./expressions/findExpressionError";

// Group D: Equations (Find X)
import { findXBasicMode } from "./equations/findXBasic";
import { findXSubMode } from "./equations/findXSub";
import { findXMulMode } from "./equations/findXMul";
import { findXDivMode } from "./equations/findXDiv";
import { findXExpressionMode } from "./equations/findXExpression";

// Group E: Fractions
import { fractionAddMode } from "./fractions/fractionAdd";
import { fractionSubMode } from "./fractions/fractionSub";
import { fractionMulMode } from "./fractions/fractionMul";
import { fractionDivMode } from "./fractions/fractionDiv";
import { fractionCompareMode } from "./fractions/fractionCompare";

// Group F: Advanced Numbers
import { divisibilityRulesMode } from "./advanced/divisibilityRules";
import { primeCheckMode } from "./advanced/primeCheck";
import { gcdLcmMode } from "./advanced/gcdLcm";
import { integerArithmeticMode } from "./advanced/integerArithmetic";
import { percentageBasicMode } from "./advanced/percentageBasic";

// Group G: Geometry & Measurement
import { perimeterAreaSquareRectMode } from "./geometry/perimeterAreaSquareRect";
import { triangleAreaMode } from "./geometry/triangleArea";
import { circleGeometryMode } from "./geometry/circleGeometry";
import { unitLengthAreaMode } from "./geometry/unitLengthArea";
import { unitTimeMassMode } from "./geometry/unitTimeMass";

// Group H: Word Problems
import { wordSumDiffMode } from "./word/wordSumDiff";
import { wordSumRatioMode } from "./word/wordSumRatio";
import { wordAverageMode } from "./word/wordAverage";
import { wordMotionSpeedMode } from "./word/wordMotionSpeed";
import { wordWorkFractionMode } from "./word/wordWorkFraction";

// Group I: English Learning
import { englishVocabTopicMode } from "./english/vocabTopic";
import { englishGrammarTensesMode } from "./english/grammarTenses";
import { englishPrepositionsMode } from "./english/prepositions";
import { englishSentenceRewriteMode } from "./english/sentenceRewrite";
import { englishWordFormsMode } from "./english/wordForms";
import { englishCollocationsIdiomsMode } from "./english/collocationsIdioms";
import { englishPhoneticsStressMode } from "./english/phoneticsStress";
import { englishSynonymsAntonymsMode } from "./english/synonymsAntonyms";
import { englishErrorIdentificationMode } from "./english/errorIdentification";
import { englishScrambledSentencesMode } from "./english/scrambledSentences";

export const ALL_PRACTICE_MODES: PracticeMode[] = [
  // English Learning
  englishVocabTopicMode,
  englishGrammarTensesMode,
  englishPrepositionsMode,
  englishSentenceRewriteMode,
  englishWordFormsMode,
  englishCollocationsIdiomsMode,
  englishPhoneticsStressMode,
  englishSynonymsAntonymsMode,
  englishErrorIdentificationMode,
  englishScrambledSentencesMode,

  // Arithmetic
  additionBasicMode,
  subtractionBasicMode,
  multiplicationBasicMode,
  divisionBasicMode,
  missingNumberMode,
  missingFactorMode,

  // Speed & Challenges
  speed60sMode,
  comboStreakMode,
  scoreConquestMode,
  survival3HeartsMode,

  // Expressions
  evaluateExpressionMode,
  parenthesesExpressionMode,
  chooseCorrectExpressionMode,
  expressionTarget24Mode,
  findExpressionErrorMode,

  // Equations
  findXBasicMode,
  findXSubMode,
  findXMulMode,
  findXDivMode,
  findXExpressionMode,

  // Fractions
  fractionAddMode,
  fractionSubMode,
  fractionMulMode,
  fractionDivMode,
  fractionCompareMode,

  // Advanced
  divisibilityRulesMode,
  primeCheckMode,
  gcdLcmMode,
  integerArithmeticMode,
  percentageBasicMode,

  // Geometry
  perimeterAreaSquareRectMode,
  triangleAreaMode,
  circleGeometryMode,
  unitLengthAreaMode,
  unitTimeMassMode,

  // Word Problems
  wordSumDiffMode,
  wordSumRatioMode,
  wordAverageMode,
  wordMotionSpeedMode,
  wordWorkFractionMode,
];

export function getAllPracticeModes(): PracticeMode[] {
  return ALL_PRACTICE_MODES;
}

export function registerAllPracticeModes(registry?: { register: (mode: PracticeMode) => void }) {
  if (registry) {
    ALL_PRACTICE_MODES.forEach((mode) => registry.register(mode));
  }
}
