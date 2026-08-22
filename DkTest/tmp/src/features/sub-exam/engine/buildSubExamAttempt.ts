import { Question, Section } from "../../../types";
import { SubExamConfig } from "../types/subExam";
import { shuffleArray, pickRandom } from "../utils/random";

export function buildSubExamAttempt(
  exam: any,
  questions: Question[],
  sections: Section[],
  config: SubExamConfig
) {
  if (!config.enabled) {
    return {
      questions,
      selectedQuestionIds: questions.map((q) => q.id),
      questionOrder: questions.map((q) => q.id),
      config,
      isSubExam: false,
      stats: { available: questions.length, selected: questions.length },
    };
  }

  const getCount = (count: number | undefined, available: number) => {
    if (count === undefined) return 0;
    if (count === -1) return available;
    if (count <= 0) return 0;
    return Math.min(count, available);
  };

  const getQuestionsByType = (
    pool: Question[],
    typeConfig: {
      singleChoiceCount?: number;
      multipleChoiceCount?: number;
      trueFalseCount?: number;
      shortAnswerCount?: number;
    }
  ) => {
    const singles = pool.filter((q) => q.type === "single_choice");
    const multiples = pool.filter((q) => q.type === "multiple_choice");
    const tfs = pool.filter((q) => q.type === "true_false");
    const shorts = pool.filter((q) => q.type === "short_answer");

    return [
      ...pickRandom(singles, getCount(typeConfig.singleChoiceCount, singles.length)),
      ...pickRandom(multiples, getCount(typeConfig.multipleChoiceCount, multiples.length)),
      ...pickRandom(tfs, getCount(typeConfig.trueFalseCount, tfs.length)),
      ...pickRandom(shorts, getCount(typeConfig.shortAnswerCount, shorts.length)),
    ];
  };

  const shuffleQuestionList = (qList: Question[], disableShuffle?: boolean) => {
    if (!exam.shuffleQuestions || disableShuffle) {
      return [...qList].sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    const unpinned = shuffleArray(qList.filter((q) => !q.pinQuestion));
    let unpinnedIdx = 0;
    return qList.map((q) => (q.pinQuestion ? q : unpinned[unpinnedIdx++]));
  };

  type TopBlock =
    | { type: "question"; id: string; order: number; isPinned: boolean; question: Question }
    | { type: "section"; id: string; order: number; isPinned: boolean; section: Section; questions: Question[] };

  let candidateBlocks: TopBlock[] = [];

  // Determine enabled sections
  const disabledSectionIds = new Set(
    config.sections?.filter((s) => !s.enabled).map((s) => s.sectionId) || []
  );
  const candidateSections = sections.filter((s) => !disabledSectionIds.has(s.id));

  // If randomSectionsCount is set (e.g. pick 1 out of 3 sections)
  let chosenSections = candidateSections;
  if (
    config.randomSectionsCount !== undefined &&
    config.randomSectionsCount > 0 &&
    config.randomSectionsCount < candidateSections.length
  ) {
    chosenSections = pickRandom(candidateSections, config.randomSectionsCount);
  }
  const chosenSectionIds = new Set(chosenSections.map((s) => s.id));

  if (config.selectionMode === "by_type") {
    // Only pool questions from outside OR from chosen sections
    const eligiblePool = questions.filter(
      (q) => !q.sectionId || chosenSectionIds.has(q.sectionId)
    );
    const pickedPool = getQuestionsByType(eligiblePool, config);

    // Build blocks from picked pool
    const outsideQs = pickedPool.filter((q) => !q.sectionId);
    outsideQs.forEach((q) => {
      candidateBlocks.push({
        type: "question",
        id: q.id,
        order: q.order ?? 0,
        isPinned: !!q.pinQuestion,
        question: q,
      });
    });

    chosenSections.forEach((sec) => {
      const secQs = pickedPool.filter((q) => q.sectionId === sec.id);
      if (secQs.length > 0) {
        candidateBlocks.push({
          type: "section",
          id: sec.id,
          order: sec.order ?? 0,
          isPinned: !!sec.pinOrder,
          section: sec,
          questions: secQs,
        });
      }
    });
  } else {
    // selectionMode === "by_section" || "by_section_and_type"
    // 1. Outside / Unsectioned questions
    const outsideQuestions = questions.filter((q) => !q.sectionId);
    outsideQuestions.forEach((q) => {
      candidateBlocks.push({
        type: "question",
        id: q.id,
        order: q.order ?? 0,
        isPinned: !!q.pinQuestion,
        question: q,
      });
    });

    // 2. Pick questions from each chosen section
    chosenSections.forEach((section) => {
      const sectionConfig = config.sections?.find((s) => s.sectionId === section.id);
      const sectionQuestions = questions.filter((q) => q.sectionId === section.id);
      let pickedSectionQuestions: Question[] = [];

      if (config.selectionMode === "by_section") {
        const countToPick =
          sectionConfig?.questionCount !== undefined
            ? getCount(sectionConfig.questionCount, sectionQuestions.length)
            : sectionQuestions.length;
        pickedSectionQuestions = pickRandom(sectionQuestions, countToPick);
      } else if (config.selectionMode === "by_section_and_type") {
        if (sectionConfig) {
          pickedSectionQuestions = getQuestionsByType(sectionQuestions, sectionConfig);
        } else {
          pickedSectionQuestions = [...sectionQuestions];
        }
      }

      if (pickedSectionQuestions.length > 0) {
        candidateBlocks.push({
          type: "section",
          id: section.id,
          order: section.order ?? 0,
          isPinned: !!section.pinOrder,
          section,
          questions: pickedSectionQuestions,
        });
      }
    });
  }

  // Sort candidate blocks initially by order
  candidateBlocks.sort((a, b) => a.order - b.order);

  // Shuffle candidate blocks (intermixing Sections and Standalone Questions together)
  const shouldShuffleTopLevel = !!(exam.shuffleSections || exam.shuffleQuestions);
  let finalBlocks = [...candidateBlocks];

  if (shouldShuffleTopLevel && finalBlocks.length > 1) {
    const unpinnedBlocks = finalBlocks.filter((b) => !b.isPinned);
    const shuffledUnpinned = shuffleArray(unpinnedBlocks);
    let unpinnedIdx = 0;
    finalBlocks = finalBlocks.map((b) =>
      b.isPinned ? b : shuffledUnpinned[unpinnedIdx++]
    );
  }

  // Shuffle internal questions inside each section block
  finalBlocks.forEach((block) => {
    if (block.type === "section") {
      block.questions = shuffleQuestionList(
        block.questions,
        block.section.disableQuestionShuffle
      );
    }
  });

  // Flatten blocks
  let finalQuestions: Question[] = [];
  finalBlocks.forEach((block) => {
    if (block.type === "question") {
      finalQuestions.push(block.question);
    } else if (block.type === "section") {
      finalQuestions.push(...block.questions);
    }
  });

  // Deduplicate by ID
  const uniqueQuestionsMap = new Map<string, Question>();
  finalQuestions.forEach((q) => uniqueQuestionsMap.set(q.id, q));
  finalQuestions = Array.from(uniqueQuestionsMap.values());

  return {
    questions: finalQuestions,
    selectedQuestionIds: finalQuestions.map((q) => q.id),
    questionOrder: finalQuestions.map((q) => q.id),
    config,
    isSubExam: true,
    stats: { available: questions.length, selected: finalQuestions.length },
  };
}
