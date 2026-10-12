import fs from "fs";
import { SIEUGIOI_QUESTIONS, SIEUGIOI_LESSONS_METADATA } from "../src/practice/data/sieugioi/sieugioiQuestions";

console.log(`Auditing SIEUGIOI_QUESTIONS: total count = ${SIEUGIOI_QUESTIONS.length}`);

let invalidKeyCount = 0;
let invalidOptionCount = 0;
let invalidOptIdCount = 0;
let emptyExplCount = 0;
let shortExplCount = 0;
let spoilerInOptionsCount = 0;
let spoilerInExplCount = 0;
let onlineAttachmentsCount = 0;

for (const q of SIEUGIOI_QUESTIONS) {
  // Check key
  if (!["A", "B", "C", "D"].includes(q.correctKey)) {
    invalidKeyCount++;
    console.error(`Invalid key: ${q.id} -> ${q.correctKey}`);
  }

  // Check options
  if (!q.options || q.options.length < 2) {
    invalidOptionCount++;
    console.error(`Invalid options count: ${q.id} -> ${q.options?.length}`);
  }

  // Check correctOptionId matches one of the options
  const optIds = q.options.map((o) => o.id);
  if (!optIds.includes(q.correctOptionId)) {
    invalidOptIdCount++;
    console.error(`correctOptionId mismatch: ${q.id} -> ${q.correctOptionId} not in ${optIds}`);
  }

  // Check explanation
  if (!q.explanation || q.explanation.trim().length === 0) {
    emptyExplCount++;
  } else if (q.explanation.trim().length < 15) {
    shortExplCount++;
  }

  // Check options text for spoiler remnants
  for (const opt of q.options) {
    if (opt.text.includes("Spoiler:") || opt.text.includes("bbCodeSpoiler")) {
      spoilerInOptionsCount++;
      console.error(`Spoiler in option: ${q.id} (${opt.key}) -> ${opt.text.slice(0, 50)}`);
    }
  }

  // Check explanation for raw spoiler bbCode tags
  if (q.explanation.includes("[/SPOILER]") || q.explanation.includes("[SPOILER]")) {
    spoilerInExplCount++;
  }

  // Check for online attachments
  if (
    q.prompt.includes("sieugioi.com/docs/attachments") ||
    q.explanation.includes("sieugioi.com/docs/attachments")
  ) {
    onlineAttachmentsCount++;
  }
}

console.log("\n================ AUDIT REPORT ================");
console.log({
  totalQuestions: SIEUGIOI_QUESTIONS.length,
  invalidKeyCount,
  invalidOptionCount,
  invalidOptIdCount,
  emptyExplCount,
  shortExplCount,
  spoilerInOptionsCount,
  spoilerInExplCount,
  onlineAttachmentsCount,
});

// Check Bài 13 specifically
const bai13Questions = SIEUGIOI_QUESTIONS.filter((q) => q.bai === 13);
console.log(`Bài 13 has ${bai13Questions.length} questions across exams.`);
console.log("\nSample Bài 13 Question 4:");
const b13q4 = bai13Questions[3]; // 4th question
if (b13q4) {
  console.log("ID:", b13q4.id);
  console.log("Prompt:", b13q4.prompt);
  console.log("Options:", b13q4.options);
  console.log("Correct:", b13q4.correctKey, b13q4.correctOptionId);
  console.log("Explanation:", b13q4.explanation);
}
