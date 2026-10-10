import type { Section, Question } from "../types";

export interface SectionTreeNode extends Section {
  subsections: SectionTreeNode[];
  directQuestions: Question[];
  allQuestions: Question[];
  totalQuestionCount: number;
}

export interface SectionTreeResult {
  tree: SectionTreeNode[];
  rootQuestions: Question[];
  hasNestedSections: boolean;
}

/**
 * Builds a structured tree of sections (supporting nested sections: parent -> subsections).
 * Used across Exam Builder, Exam Taking, Exam Details, and Exam Merging.
 */
export function buildSectionTree(
  sections: Section[] = [],
  questions: Question[] = []
): SectionTreeResult {
  const rootQuestions = questions.filter((q) => !q.sectionId);
  const questionsBySection = new Map<string, Question[]>();
  questions.forEach((q) => {
    if (q.sectionId) {
      if (!questionsBySection.has(q.sectionId)) {
        questionsBySection.set(q.sectionId, []);
      }
      questionsBySection.get(q.sectionId)!.push(q);
    }
  });

  const sectionMap = new Map<string, SectionTreeNode>();
  sections.forEach((sec) => {
    const directQuestions = questionsBySection.get(sec.id) || [];
    sectionMap.set(sec.id, {
      ...sec,
      depth: sec.depth ?? (sec.parentSectionId ? 1 : 0),
      subsections: [],
      directQuestions,
      allQuestions: [...directQuestions],
      totalQuestionCount: directQuestions.length,
    });
  });

  let hasNestedSections = false;
  const roots: SectionTreeNode[] = [];

  sections.forEach((sec) => {
    const node = sectionMap.get(sec.id);
    if (!node) return;

    if (sec.parentSectionId && sectionMap.has(sec.parentSectionId)) {
      hasNestedSections = true;
      const parentNode = sectionMap.get(sec.parentSectionId)!;
      parentNode.subsections.push(node);
    } else {
      roots.push(node);
    }
  });

  // Calculate totals and sort
  roots.forEach((root) => {
    root.subsections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const allChildQuestions: Question[] = [];
    root.subsections.forEach((sub) => {
      allChildQuestions.push(...sub.directQuestions);
    });
    root.allQuestions = [...root.directQuestions, ...allChildQuestions];
    root.totalQuestionCount = root.allQuestions.length;
  });

  roots.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return {
    tree: roots,
    rootQuestions,
    hasNestedSections,
  };
}

/**
 * Flattens a section tree into an ordered list preserving depth and parent-child order.
 */
export function flattenSectionTree(tree: SectionTreeNode[]): Section[] {
  const flattened: Section[] = [];
  const traverse = (nodes: SectionTreeNode[], depth = 0) => {
    nodes.forEach((node) => {
      const { subsections, directQuestions, allQuestions, totalQuestionCount, ...baseSec } = node;
      flattened.push({
        ...baseSec,
        depth,
      });
      if (subsections.length > 0) {
        traverse(subsections, depth + 1);
      }
    });
  };
  traverse(tree, 0);
  return flattened;
}
