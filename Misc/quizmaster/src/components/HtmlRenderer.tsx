import React, { useRef } from 'react';
import DOMPurify from 'dompurify';
import katex from 'katex';

interface HtmlRendererProps {
  html: string;
  className?: string;
}

export default function HtmlRenderer({ html, className }: HtmlRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  DOMPurify.addHook('afterSanitizeAttributes', function (node) {
    if (node.tagName === 'IMG' && node.hasAttribute('src')) {
      const src = node.getAttribute('src');
      if (src && !src.startsWith('http') && !src.startsWith('data:')) {
        const newSrc = src.startsWith('/') ? src.slice(1) : src;
        node.setAttribute('src', `https://m.empire.edu.vn/bucket-empiree/${newSrc}`);
      }
    }
  });

  let sanitized = DOMPurify.sanitize(html || '', {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling']
  });

  DOMPurify.removeHook('afterSanitizeAttributes');

  // Parse LaTeX manually after DOMPurify to ensure it renders reliably in React
  if (sanitized) {
    sanitized = sanitized.replace(/\$\$(.*?)\$\$/gs, (match, math) => {
      try {
        return katex.renderToString(math, { displayMode: true, throwOnError: false });
      } catch (e) {
        return match;
      }
    });

    sanitized = sanitized.replace(/\\\[(.*?)\\\]/gs, (match, math) => {
      try {
        return katex.renderToString(math, { displayMode: true, throwOnError: false });
      } catch (e) {
        return match;
      }
    });

    sanitized = sanitized.replace(/\\\((.*?)\\\)/gs, (match, math) => {
      try {
        return katex.renderToString(math, { displayMode: false, throwOnError: false });
      } catch (e) {
        return match;
      }
    });
  }

  return (
    <div 
      ref={containerRef}
      className={`prose prose-slate max-w-none prose-img:rounded-md prose-img:shadow-sm ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
