import {preprocessStrokes,isStrokeMeaningful} from "../vendor/ink-on/upstream/src/core/preprocessing.ts";
import {decodeToTokenArray} from "../vendor/ink-on/upstream/src/core/tokenizer.ts";
import {repairLatex} from "../vendor/ink-on/upstream/src/core/latex-repair.ts";
window.InkOcrCore={preprocessStrokes,isStrokeMeaningful,decodeToTokenArray,repairLatex};
