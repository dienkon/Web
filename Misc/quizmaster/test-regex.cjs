const katex = require('katex');
let html = 'A \\(x = 2\\)';
let sanitized = html.replace(/\\\((.*?)\\\)/gs, (match, math) => {
    return katex.renderToString(math, { displayMode: false, throwOnError: false });
});
console.log(sanitized);
