import type { Exam, Question, Section } from "../types";

export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export type TopLevelBlock =
  | {
      type: "question";
      id: string;
      order: number;
      isPinned: boolean;
      question: Question;
    }
  | {
      type: "section";
      id: string;
      order: number;
      isPinned: boolean;
      section: Section;
      questions: Question[];
    };

/**
 * Organizes and shuffles an exam's questions and sections.
 * Standalone questions and Section blocks are treated as peers (top-level blocks),
 * allowing sections to be randomly positioned anywhere among standalone questions
 * according to their initial order or shuffle configuration.
 */
export function organizeAndShuffleExam(
  exam: Partial<Exam>,
  questions: Question[],
  sections: Section[]
): {
  orderedQuestions: Question[];
  orderedSections: Section[];
  blocks: TopLevelBlock[];
} {
  const sectionMap = new Map<string, Section>();
  sections.forEach((s) => sectionMap.set(s.id, s));

  // 1. Group questions by section
  const sectionQuestionsMap = new Map<string, Question[]>();
  sections.forEach((s) => sectionQuestionsMap.set(s.id, []));

  const standaloneQuestions: Question[] = [];

  questions.forEach((q) => {
    if (q.sectionId && sectionMap.has(q.sectionId)) {
      sectionQuestionsMap.get(q.sectionId)!.push(q);
    } else {
      standaloneQuestions.push(q);
    }
  });

  // 2. Build initial top-level blocks
  const initialBlocks: TopLevelBlock[] = [];

  standaloneQuestions.forEach((q) => {
    initialBlocks.push({
      type: "question",
      id: q.id,
      order: q.order ?? 0,
      isPinned: !!q.pinQuestion,
      question: q,
    });
  });

  sections.forEach((sec) => {
    const secQs = sectionQuestionsMap.get(sec.id) || [];
    initialBlocks.push({
      type: "section",
      id: sec.id,
      order: sec.order ?? 0,
      isPinned: !!sec.pinOrder,
      section: sec,
      questions: secQs,
    });
  });

  // Sort blocks initially by their order
  initialBlocks.sort((a, b) => a.order - b.order);

  // 3. Shuffle Top-Level Blocks if shuffleSections OR shuffleQuestions is enabled
  let finalBlocks = [...initialBlocks];
  const shouldShuffleTopLevel = !!(exam.shuffleSections || exam.shuffleQuestions);

  if (shouldShuffleTopLevel && finalBlocks.length > 1) {
    const unpinnedBlocks = finalBlocks.filter((b) => !b.isPinned);
    const shuffledUnpinned = shuffleArray(unpinnedBlocks);
    let unpinnedIdx = 0;
    finalBlocks = finalBlocks.map((b) =>
      b.isPinned ? b : shuffledUnpinned[unpinnedIdx++]
    );
  }

  // 4. Shuffle questions INSIDE each section block (if enabled for that section)
  finalBlocks.forEach((block) => {
    if (block.type === "section") {
      let secQs = [...block.questions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const shouldShuffleInside =
        exam.shuffleQuestions && !block.section.disableQuestionShuffle;

      if (shouldShuffleInside && secQs.length > 1) {
        const unpinnedQs = secQs.filter((q) => !q.pinQuestion);
        const shuffledUnpinned = shuffleArray(unpinnedQs);
        let unpinnedIdx = 0;
        secQs = secQs.map((q) =>
          q.pinQuestion ? q : shuffledUnpinned[unpinnedIdx++]
        );
      }
      block.questions = secQs;
    }
  });

  // 5. Flatten blocks to final question list
  const orderedQuestions: Question[] = [];
  const orderedSections: Section[] = [];

  finalBlocks.forEach((block) => {
    if (block.type === "question") {
      orderedQuestions.push(block.question);
    } else if (block.type === "section") {
      orderedSections.push(block.section);
      orderedQuestions.push(...block.questions);
    }
  });

  return {
    orderedQuestions,
    orderedSections,
    blocks: finalBlocks,
  };
}
