import fs from "node:fs";
const json = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const summary = {
  compoundCount: json("shared/compounds.json").length,
  studyQuestionIds: json("shared/study-questions.json").map((q) => q.id),
};
fs.writeFileSync("shared/platform-summary.json", JSON.stringify(summary, null, 2) + "\n");
