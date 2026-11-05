import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import "mathjax-full/js/input/tex/ams/AmsConfiguration.js";
const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const doc = mathjax.document("", {
  InputJax: new TeX({
    packages: ["base", "ams"],
    maxBuffer: 8192,
    maxMacros: 1000,
  }),
  OutputJax: new SVG({ fontCache: "none", internalSpeechTitles: false }),
});
globalThis.MathTypesetter = {
  render(tex) {
    const node = doc.convert(tex, { display: true });
    return adaptor.outerHTML(adaptor.firstChild(node));
  },
};
