import React from 'react';

interface CodeViewerProps {
  code: string;
  startLine?: number;
  highlightLine?: number;
  language?: string;
  diffMode?: boolean;
  originalCode?: string;
  fixedCode?: string;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  code,
  startLine = 1,
  highlightLine,
  diffMode = false,
  originalCode,
  fixedCode
}) => {
  if (diffMode && originalCode && fixedCode) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-950 font-mono text-xs overflow-x-auto text-zinc-300">
        <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
          <span>Proposed Patch Diff</span>
          <span className="text-zinc-500">Non-destructive preview</span>
        </div>
        <div className="p-3 space-y-1">
          <div className="text-rose-400 bg-rose-950/40 px-2 py-1 rounded border-l-2 border-rose-500 flex items-start gap-2">
            <span className="select-none text-rose-500 font-bold">-</span>
            <pre className="whitespace-pre-wrap">{originalCode}</pre>
          </div>
          <div className="text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded border-l-2 border-emerald-500 flex items-start gap-2">
            <span className="select-none text-emerald-500 font-bold">+</span>
            <pre className="whitespace-pre-wrap">{fixedCode}</pre>
          </div>
        </div>
      </div>
    );
  }

  const lines = code.split('\n');

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-950 font-mono text-xs overflow-x-auto text-zinc-300 shadow-inner">
      <div className="p-3">
        {lines.map((line, idx) => {
          const currentLineNum = startLine + idx;
          const isHighlighted = highlightLine === currentLineNum;

          return (
            <div
              key={idx}
              className={`flex items-start gap-4 px-2 py-0.5 rounded transition-colors ${
                isHighlighted
                  ? 'bg-rose-950/60 text-rose-200 border-l-2 border-rose-500'
                  : 'hover:bg-zinc-900/50'
              }`}
            >
              <span className="w-8 text-right select-none text-zinc-600 shrink-0">
                {currentLineNum}
              </span>
              <pre className="whitespace-pre-wrap leading-relaxed overflow-x-auto">{line || ' '}</pre>
            </div>
          );
        })}
      </div>
    </div>
  );
};
