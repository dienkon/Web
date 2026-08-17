const { JSDOM } = require('jsdom');
const DOMPurify = require('dompurify')(new JSDOM('').window);

let html = 'Nghiệm của phương trình \\(x^2 - 4 = 0\\) là:';
let sanitized = DOMPurify.sanitize(html);
console.log("Sanitized:", JSON.stringify(sanitized));

sanitized = sanitized.replace(/\\\((.*?)\\\)/gs, (match, math) => {
  return "MATH[" + math + "]";
});
console.log("Replaced:", JSON.stringify(sanitized));
