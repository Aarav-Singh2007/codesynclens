import React from 'react';
import { AnalysisSummary, Finding } from '../types';
import { Shield, Bug, Flame, Trash2, ArrowRight, CheckCircle } from 'lucide-react';

interface SummaryCardProps {
  summary: AnalysisSummary;
  topFindings: Finding[];
  onSelectFinding: (finding: Finding) => void;
  onFilterCategory: (category: string) => void;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  summary,
  topFindings,
  onSelectFinding,
  onFilterCategory
}) => {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-6 sm:p-8 space-y-6 shadow-xs">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">{summary.projectName}</h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                summary.analysisMode === 'DEMO'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              }`}
            >
              {summary.analysisMode === 'DEMO' ? 'DEMO ANALYSIS' : 'REAL ANALYSIS'}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Analysis complete · {summary.totalFiles} {summary.totalFiles === 1 ? 'file' : 'files'} ({summary.linesOfCode} lines of code) in {summary.durationMs}ms
          </p>
        </div>

        {/* Severity Count Pills */}
        <div className="flex items-center flex-wrap gap-2 text-xs font-semibold">
          <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
            {summary.criticalCount} critical
          </span>
          <span className="px-2.5 py-1 rounded-md bg-orange-50 text-orange-700 border border-orange-200">
            {summary.highCount} high
          </span>
          <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            {summary.mediumCount} medium
          </span>
          <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            {summary.lowCount} low
          </span>
        </div>
      </div>

      {/* Two Column Layout: Most Important Findings vs Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-1">
        {/* Left 2 Cols: Most Important Findings */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-500">
              Priority Findings
            </h3>
            <span className="text-xs text-zinc-400">Click to inspect & fix</span>
          </div>

          {topFindings.length === 0 ? (
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Clean scan! Zero critical or high-severity vulnerabilities identified.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {topFindings.slice(0, 3).map((finding) => (
                <button
                  key={finding.id}
                  onClick={() => onSelectFinding(finding)}
                  className="w-full text-left p-3.5 rounded-lg border border-zinc-200 bg-zinc-50/60 hover:bg-zinc-100 hover:border-zinc-300 transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          finding.severity === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800'
                            : finding.severity === 'HIGH'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {finding.severity}
                      </span>
                      <span className="text-sm font-semibold text-zinc-900 group-hover:text-black">
                        {finding.title}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-zinc-500">
                      {finding.file}:{finding.lineStart} · <span className="text-zinc-600">{finding.provenance.source}</span>
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Category Health Quick Filters */}
        <div className="space-y-3">
          <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-500">
            Code Health by Category
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => onFilterCategory('SECURITY')}
              className="w-full flex items-center justify-between p-2.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-xs transition-colors"
            >
              <div className="flex items-center gap-2 text-zinc-700">
                <Shield className="w-4 h-4 text-rose-600" />
                <span className="font-medium">Security & Secrets</span>
              </div>
              <span className="font-semibold text-zinc-900">
                {(summary.categoryCounts.SECURITY || 0) + (summary.categoryCounts.SECRET || 0)} findings
              </span>
            </button>

            <button
              onClick={() => onFilterCategory('BUG')}
              className="w-full flex items-center justify-between p-2.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-xs transition-colors"
            >
              <div className="flex items-center gap-2 text-zinc-700">
                <Bug className="w-4 h-4 text-orange-600" />
                <span className="font-medium">Bugs & Logic</span>
              </div>
              <span className="font-semibold text-zinc-900">
                {summary.categoryCounts.BUG || 0} findings
              </span>
            </button>

            <button
              onClick={() => onFilterCategory('CODE_SMELL')}
              className="w-full flex items-center justify-between p-2.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-xs transition-colors"
            >
              <div className="flex items-center gap-2 text-zinc-700">
                <Flame className="w-4 h-4 text-amber-600" />
                <span className="font-medium">Code Smells</span>
              </div>
              <span className="font-semibold text-zinc-900">
                {summary.categoryCounts.CODE_SMELL || 0} findings
              </span>
            </button>

            <button
              onClick={() => onFilterCategory('DEAD_CODE')}
              className="w-full flex items-center justify-between p-2.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-xs transition-colors"
            >
              <div className="flex items-center gap-2 text-zinc-700">
                <Trash2 className="w-4 h-4 text-zinc-500" />
                <span className="font-medium">Dead Code</span>
              </div>
              <span className="font-semibold text-zinc-900">
                {summary.categoryCounts.DEAD_CODE || 0} findings
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
