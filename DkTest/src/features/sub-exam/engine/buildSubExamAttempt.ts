import { Question, Section } from "../../../types";
import { SubExamConfig } from "../types/subExam";
import { shuffleArray, pickRandom } from "../utils/random";

export function buildSubExamAttempt(
  exam: any,
  questions: Question[],
  sections: Section[],
  config: SubExamConfig
) {
  if (!questions || questions.length === 0) {
    return {
      questions: [],
      selectedQuestionIds: [],
      questionOrder: [],
      config: config || { enabled: false, selectionMode: "by_type" },
      isSubExam: false,
      stats: { available: 0, selected: 0 },
    };
  }

  // If sub-exam is explicitly disabled
  if (config && config.enabled === false) {
    return {
      questions,
      selectedQuestionIds: questions.map((q) => q.id),
      questionOrder: questions.map((q) => q.id),
      config,
      isSubExam: false,
      stats: { available: questions.length, selected: questions.length },
    };
  }

  const effectiveConfig: SubExamConfig = {
    selectionMode: "by_type",
    ...config,
    enabled: true,
  };

  const targetTotal =
    effectiveConfig.totalQuestionCount !== undefined && effectiveConfig.totalQuestionCount > 0
      ? effectiveConfig.totalQuestionCount
      : effectiveConfig.questionCount !== undefined && effectiveConfig.questionCount > 0
      ? effectiveConfig.questionCount
      : effectiveConfig.numberOfQuestions !== undefined && effectiveConfig.numberOfQuestions > 0
      ? effectiveConfig.numberOfQuestions
      : undefined;

  const getCount = (count: number | undefined, available: number, defaultAll = true) => {
    if (count === undefined) return defaultAll ? available : 0;
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
      orderingCount?: number;
      fillBlankCount?: number;
      matchingCount?: number;
    }
  ) => {
    const singles = pool.filter((q) => q.type === "single_choice");
    const multiples = pool.filter((q) => q.type === "multiple_choice");
    const tfs = pool.filter((q) => q.type === "true_false");
    const shorts = pool.filter((q) => q.type === "short_answer");
    const orderings = pool.filter((q) => q.type === "ordering");
    const fillBlanks = pool.filter((q) => q.type === "fill_blank");
    const matchings = pool.filter((q) => q.type === "matching");

    const hasAnyExplicitCount =
      typeConfig.singleChoiceCount !== undefined ||
      typeConfig.multipleChoiceCount !== undefined ||
      typeConfig.trueFalseCount !== undefined ||
      typeConfig.shortAnswerCount !== undefined ||
      typeConfig.orderingCount !== undefined ||
      typeConfig.fillBlankCount !== undefined ||
      typeConfig.matchingCount !== undefined;

    // If no type-specific count is defined and targetTotal is provided:
    if (!hasAnyExplicitCount && targetTotal && targetTotal > 0) {
      return pickRandom(pool, Math.min(targetTotal, pool.length));
    }

    return [
      ...pickRandom(singles, getCount(typeConfig.singleChoiceCount, singles.length)),
      ...pickRandom(multiples, getCount(typeConfig.multipleChoiceCount, multiples.length)),
      ...pickRandom(tfs, getCount(typeConfig.trueFalseCount, tfs.length)),
      ...pickRandom(shorts, getCount(typeConfig.shortAnswerCount, shorts.length)),
      ...pickRandom(orderings, getCount(typeConfig.orderingCount, orderings.length)),
      ...pickRandom(fillBlanks, getCount(typeConfig.fillBlankCount, fillBlanks.length)),
      ...pickRandom(matchings, getCount(typeConfig.matchingCount, matchings.length)),
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
    effectiveConfig.sections?.filter((s) => !s.enabled).map((s) => s.sectionId) || []
  );
  const candidateSections = sections.filter((s) => !disabledSectionIds.has(s.id));

  // If randomSectionsCount is set (e.g. pick 1 out of 3 sections)
  let chosenSections = candidateSections;
  if (
    effectiveConfig.randomSectionsCount !== undefined &&
    effectiveConfig.randomSectionsCount > 0 &&
    effectiveConfig.randomSectionsCount < candidateSections.length
  ) {
    chosenSections = pickRandom(candidateSections, effectiveConfig.randomSectionsCount);
  }
  const chosenSectionIds = new Set(chosenSections.map((s) => s.id));

  const isRandomTotalMode =
    effectiveConfig.selectionMode === "random_total" ||
    (targetTotal !== undefined &&
      !effectiveConfig.sections?.length &&
      effectiveConfig.singleChoiceCount === undefined &&
      effectiveConfig.multipleChoiceCount === undefined &&
      effectiveConfig.trueFalseCount === undefined &&
      effectiveConfig.shortAnswerCount === undefined);

  if (isRandomTotalMode) {
    const eligiblePool = questions.filter(
      (q) => !q.sectionId || chosenSectionIds.has(q.sectionId)
    );
    const countToPick = targetTotal ? Math.min(targetTotal, eligiblePool.length) : eligiblePool.length;
    const pickedPool = pickRandom(eligiblePool, countToPick);

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
  } else if (effectiveConfig.selectionMode === "by_type") {
    // Only pool questions from outside OR from chosen sections
    const eligiblePool = questions.filter(
      (q) => !q.sectionId || chosenSectionIds.has(q.sectionId)
    );
    let pickedPool = getQuestionsByType(eligiblePool, effectiveConfig);

    if (targetTotal && targetTotal > 0 && pickedPool.length > targetTotal) {
      pickedPool = pickRandom(pickedPool, targetTotal);
    }

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
      const sectionConfig = effectiveConfig.sections?.find((s) => s.sectionId === section.id);
      const sectionQuestions = questions.filter((q) => q.sectionId === section.id);
      let pickedSectionQuestions: Question[] = [];

      if (effectiveConfig.selectionMode === "by_section") {
        const countToPick =
          sectionConfig?.questionCount !== undefined && sectionConfig.questionCount >= 0
            ? getCount(sectionConfig.questionCount, sectionQuestions.length)
            : sectionQuestions.length;
        pickedSectionQuestions = pickRandom(sectionQuestions, countToPick);
      } else if (effectiveConfig.selectionMode === "by_section_and_type") {
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

  // ULTIMATE SAFETY GUARD: If for any reason zero questions were selected,
  // fallback to pickRandom(questions, targetTotal || questions.length) instead of an empty exam!
  if (finalQuestions.length === 0 && questions.length > 0) {
    const fallbackCount = targetTotal && targetTotal > 0 ? Math.min(targetTotal, questions.length) : questions.length;
    finalQuestions = pickRandom(questions, fallbackCount);
  }

  return {
    questions: finalQuestions,
    selectedQuestionIds: finalQuestions.map((q) => q.id),
    questionOrder: finalQuestions.map((q) => q.id),
    config: effectiveConfig,
    isSubExam: true,
    stats: { available: questions.length, selected: finalQuestions.length },
  };
}
