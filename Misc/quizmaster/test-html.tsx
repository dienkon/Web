import React from 'react';
import { renderToString } from 'react-dom/server';
import HtmlRenderer from './src/components/HtmlRenderer';

const html = "Nghiệm của phương trình \\(x^2 - 4 = 0\\) là: A \\(x = 2\\)";
console.log(renderToString(<HtmlRenderer html={html} />));
