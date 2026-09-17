import React, { useState } from 'react';
import { Finding, FindingSeverity } from '../types';
import { CodeViewer } from './CodeViewer';
import {
  X,
  Sparkles,
  ShieldCheck,
  Check,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  FileCode,
  ShieldAlert,
  Loader2,
  Info
} from 'lucide-react';

interface FindingDetailProps {
  finding: Finding | null;
  fileContent?: string;
  onClose: () => void;
  onApplyFix: (finding: Finding, updatedCode: string) => Promise<void>;
  onMarkStatus: (findingId: string, status: Finding['status']) => void;
  onRunVerification: (finding: Finding) => Promise<void>;
}

export const FindingDetail: React.FC<FindingDetailProps> = ({
  finding,
  fileContent,
  onClose,
  onApplyFix,
  onMarkStatus,
  onRunVerification
}) => {
  const [showFixPreview, setShowFixPreview] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<{
    whyDetected?: string;
    whyMatters?: string;
    potentialImpact?: string;
    recommendedChange?: string;
    exampleCode?: string | null;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [applying, setApplying] = useState(false);

  if (!finding) return null;

  const handleRequestAiExplanation = async () => {
    try {
      setExplaining(true);
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finding,
          contextCode: fileContent
        })
      });
      const data = await res.json();
      setAiExplanation(data);
    } catch (err) {
      console.error('AI explanation request failed:', err);
    } finally {
      setExplaining(false);
    }
  };

  const handleApplyProposedFix = async () => {
    if (!finding.suggestedCode) return;
    setApplying(true);
    try {
      await onApplyFix(finding, finding.suggestedCode);
      setShowFixPreview(false);
    } finally {
      setApplying(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await onRunVerification(finding);
    } finally {
      setVerifying(false);
    }
  };

  const originalSnippetLine = finding.codeSnippet.split('\n')[0] || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-zinc-200 flex items-start justify-between gap-4 bg-zinc-50/50">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded tracking-wide ${
                  finding.severity === 'CRITICAL'
                    ? 'bg-rose-100 text-rose-800'
                    : finding.severity === 'HIGH'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {finding.severity}
              </span>

              <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-medium">
                {finding.category.replace('_', ' ')}
              </span>

              <span className="text-xs text-zinc-500 font-mono">
                {finding.confidence} Confidence
              </span>

              {finding.status === 'VERIFIED' && (
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified Eliminated
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-zinc-900 leading-snug">{finding.title}</h2>

            <p className="text-xs font-mono text-zinc-500 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-zinc-400" />
              <span>{finding.file}:{finding.lineStart}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-md hover:bg-zinc-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Code Excerpt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-600">
              <span>Code Excerpt</span>
              <span className="font-mono text-zinc-400">Line {finding.lineStart}</span>
            </div>
            <CodeViewer
              code={finding.codeSnippet}
              startLine={Math.max(1, finding.lineStart - 2)}
              highlightLine={finding.lineStart}
            />
          </div>

          {/* Evidence & Provenance Block */}
          <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 space-y-2 text-xs">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Deterministic Evidence</span>
              <span className="font-mono text-[11px] text-zinc-600">
                Provider: {finding.provenance.source} {finding.provenance.ruleId ? `(${finding.provenance.ruleId})` : ''}
              </span>
            </div>
            <p className="text-zinc-800 font-mono text-xs">{finding.evidence}</p>
            {finding.provenance.corroboratedBy && finding.provenance.corroboratedBy.length > 0 && (
              <p className="text-zinc-500 text-[11px] pt-1 border-t border-zinc-200">
                Corroborated across multiple engines: {finding.provenance.corroboratedBy.join(', ')}
              </p>
            )}
          </div>

          {/* Explanation Engine (Grounded in Gemini) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>AI Technical Explanation</span>
              </div>
              {!aiExplanation && (
                <button
                  onClick={handleRequestAiExplanation}
                  disabled={explaining}
                  className="text-xs px-2.5 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-medium transition-colors flex items-center gap-1"
                >
                  {explaining ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Reasoning...</span>
                    </>
                  ) : (
                    <span>Enrich with Gemini</span>
                  )}
                </button>
              )}
            </div>

            <div className="p-4 rounded-lg bg-white border border-zinc-200 space-y-3 text-xs">
              <div>
                <h4 className="font-semibold text-zinc-900 mb-1">Why This Was Detected</h4>
                <p className="text-zinc-600 leading-relaxed">
                  {aiExplanation?.whyDetected || finding.explanation || 'Identified via deterministic static code analysis.'}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-zinc-900 mb-1">Why It Matters & Technical Impact</h4>
                <p className="text-zinc-600 leading-relaxed">
                  {aiExplanation?.whyMatters || finding.impact || 'Exposes the system to potential instability or security exploitation.'}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-zinc-900 mb-1">Suggested Improvement</h4>
                <p className="text-zinc-600 leading-relaxed">
                  {aiExplanation?.recommendedChange || finding.recommendation}
                </p>
              </div>
            </div>
          </div>

          {/* Verification Status (if verified) */}
          {finding.verification && (
            <div
              className={`p-4 rounded-lg border text-xs space-y-1 ${
                finding.verification.status === 'VERIFIED'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Verification Result: {finding.verification.status}</span>
              </div>
              <p className="leading-relaxed">{finding.verification.message}</p>
              <p className="text-[10px] text-zinc-500 font-mono">
                Verified at {new Date(finding.verification.verifiedAt).toLocaleTimeString()} by {finding.verification.verifier}
              </p>
            </div>
          )}

          {/* Proposed Patch & Diff View (when fix generated) */}
          {showFixPreview && finding.suggestedCode && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                <span>Proposed Non-Destructive Patch</span>
              </h4>
              <CodeViewer
                code=""
                diffMode={true}
                originalCode={finding.codeSnippet.split('\n')[finding.codeSnippet.split('\n').length > 2 ? 2 : 0] || 'Original code'}
                fixedCode={finding.suggestedCode}
              />
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs">
                <span className="text-zinc-600">Requires explicit user approval to apply patch.</span>
                <button
                  onClick={handleApplyProposedFix}
                  disabled={applying}
                  id="btn-confirm-apply-patch"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors shadow-xs flex items-center gap-1.5"
                >
                  {applying ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Applying...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve & Apply Fix</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onMarkStatus(finding.id, 'IGNORED')}
              className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200 rounded-md transition-colors"
            >
              Ignore Finding
            </button>
            <button
              onClick={() => onMarkStatus(finding.id, finding.status === 'FIXED' ? 'OPEN' : 'FIXED')}
              className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200 rounded-md transition-colors"
            >
              {finding.status === 'FIXED' ? 'Re-open Finding' : 'Mark as Fixed'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {finding.suggestedCode && !showFixPreview && (
              <button
                onClick={() => setShowFixPreview(true)}
                id="btn-generate-fix"
                className="px-4 py-1.5 text-xs font-semibold text-zinc-900 bg-white hover:bg-zinc-100 border border-zinc-300 rounded-md transition-colors flex items-center gap-1.5"
              >
                <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                <span>Review Proposed Fix</span>
              </button>
            )}

            <button
              onClick={handleVerify}
              disabled={verifying}
              id="btn-verify-finding"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 rounded-md shadow-xs transition-colors flex items-center gap-1.5"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying Pass...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verify Fix Status</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
