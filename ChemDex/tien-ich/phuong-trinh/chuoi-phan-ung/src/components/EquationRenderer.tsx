import { useEffect, useRef } from 'react';
import katex from 'katex';

interface EquationRendererProps {
  latex: string;
  inline?: boolean;
}

export default function EquationRenderer({ latex, inline = false }: EquationRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // Format LaTeX slightly for KaTeX safety (e.g., escape backslashes if double escaped)
      const sanitizedLatex = latex
        .replace(/\\xrightleftharpoons/g, '\\rightleftharpoons') // KaTeX has standard \rightleftharpoons
        .replace(/\\xlongequal/g, '\\xequal'); // support arrow conditions

      const html = katex.renderToString(sanitizedLatex, {
        throwOnError: false,
        displayMode: !inline,
        trust: true,
        strict: false
      });
      containerRef.current.innerHTML = html;
    } catch (error) {
      console.error("KaTeX rendering error:", error);
      // Fallback to text presentation
      containerRef.current.textContent = latex;
    }
  }, [latex, inline]);

  if (inline) {
    return (
      <span 
        ref={containerRef} 
        className="inline-block select-all"
      />
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="select-all my-1 text-center text-lg md:text-xl font-medium text-slate-800 dark:text-slate-100 min-w-max px-4 mx-auto"
    />
  );
}
