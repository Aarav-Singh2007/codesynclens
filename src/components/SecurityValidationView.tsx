import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  Play,
  RefreshCw,
  Terminal,
  ExternalLink,
  ChevronRight,
  X,
  Search,
  Lock,
  FileText,
  Sparkles,
  ArrowRight,
  Server,
  Zap,
  Download,
} from 'lucide-react';
import {
  SecurityValidationFinding,
  SecurityValidationSummary,
  SecurityValidationSession,
  FindingSeverity,
} from '../types';
import { generateSecurityReportPdf } from '../utils/securityReportPdf';
import { SentinelAIChat } from './SentinelAIChat';

export const SecurityValidationView: React.FC = () => {
  // Target and configuration
  const [targetUrl, setTargetUrl] = useState('http://127.0.0.1:3000/api/health');
  const [authorized, setAuthorized] = useState(false);
  const [scanMode, setScanMode] = useState<'quick' | 'standard' | 'full'>('quick');

  // Execution state
  const [isScanning, setIsScanning] = useState(false);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [currentSession, setCurrentSession] = useState<SecurityValidationSession | null>(null);
  const [summary, setSummary] = useState<SecurityValidationSummary | null>(null);
  const [findings, setFindings] = useState<SecurityValidationFinding[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);

  // Engine health
  const [engineHealth, setEngineHealth] = useState<{
    available: boolean;
    engineVersion?: string;
    message: string;
  } | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // Findings UI filtering & selection
  const [selectedFinding, setSelectedFinding] = useState<SecurityValidationFinding | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  // AI Explanation state
  const [isExplaining, setIsExplaining] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<{
    rootCause: string;
    impactAnalysis: string;
    defensiveMitigation: string;
    verificationGuidance: string;
    aiGroundingNotice?: string;
  } | null>(null);

  // PDF Report Generation state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfSuccess, setPdfSuccess] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Check health on mount
  useEffect(() => {
    checkHealth();
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scanLogs]);

  const checkHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const res = await fetch('/api/security-validation/health');
      const data = await res.json();
      setEngineHealth(data);
    } catch {
      setEngineHealth({
        available: false,
        message: 'Unable to connect to security validation backend service.',
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleStartScan = async () => {
    if (!authorized) {
      setScanError('You must check the authorization box confirming you are permitted to security-test this target.');
      return;
    }

    let cleanUrl = (targetUrl || '').trim().replace(/^["'`<]+|["'`>]+$/g, '').trim();
    if (!cleanUrl) {
      setScanError('Target URL is required. Please provide a valid HTTP or HTTPS endpoint (e.g. http://127.0.0.1:3000/api/health).');
      return;
    }

    // Auto-prefix http:// if no protocol was specified
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = cleanUrl.startsWith('//') ? `http:${cleanUrl}` : `http://${cleanUrl}`;
      setTargetUrl(cleanUrl);
    }

    setIsScanning(true);
    setScanError(null);
    setScanLogs([`[${new Date().toLocaleTimeString()}] Dispatching security validation request for ${cleanUrl}...`]);
    setSelectedFinding(null);
    setAiExplanation(null);

    try {
      const res = await fetch('/api/security-validation/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl: cleanUrl,
          authorized: true,
          scanMode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Security validation failed');
      }

      setCurrentSession(data.session);
      setFindings(data.findings || []);
      setSummary(data.summary || null);
      if (data.session?.logs) {
        setScanLogs(data.session.logs);
      }
    } catch (err: any) {
      setScanError(err.message || 'An error occurred during security validation.');
      setScanLogs((prev) => [...prev, `[ERROR] ${err.message}`]);
    } finally {
      setIsScanning(false);
    }
  };

  // AI Explanation handler
  const handleRequestAiExplanation = async (finding: SecurityValidationFinding) => {
    setIsExplaining(true);
    setAiExplanation(null);
    try {
      const res = await fetch('/api/security-validation/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finding }),
      });
      const data = await res.json();
      if (res.ok) {
        setAiExplanation(data);
      } else {
        throw new Error(data.error || 'Failed to generate explanation');
      }
    } catch (err: any) {
      setAiExplanation({
        rootCause: finding.description,
        impactAnalysis: `Exposure identified at ${finding.url}. Evidence: ${finding.evidence}`,
        defensiveMitigation: finding.remediation,
        verificationGuidance: 'Re-run validation scan after applying configuration patch.',
        aiGroundingNotice: err.message,
      });
    } finally {
      setIsExplaining(false);
    }
  };

  // PDF Report Generation Handler
  const handleDownloadPdfReport = async () => {
    if (!summary || findings.length === 0) {
      setPdfError('No completed security assessment is available. Run an assessment first.');
      return;
    }

    setIsGeneratingPdf(true);
    setPdfError(null);
    setPdfSuccess(null);

    try {
      await generateSecurityReportPdf({
        summary,
        findings,
        targetUrl: currentSession?.targetUrl || targetUrl,
      });
      setPdfSuccess('Security assessment report downloaded successfully.');
      setTimeout(() => setPdfSuccess(null), 6000);
    } catch (err: any) {
      console.error('PDF generation error:', err);
      setPdfError(err?.message || 'Failed to generate PDF security report.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Filtered findings
  const filteredFindings = findings.filter((f) => {
    const matchesSearch =
      f.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.evidence.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity =
      severityFilter === 'ALL' || f.severity === severityFilter;

    return matchesSearch && matchesSeverity;
  });

  const getSeverityBadgeClass = (severity: FindingSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'HIGH':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'MEDIUM':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'INFO':
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner & Engine Attribution */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
                Security Validation & DAST
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                Deep Eye Engine
              </span>
            </div>
            <p className="text-xs text-zinc-500 max-w-3xl">
              Defensive dynamic application security testing (DAST) powered by the open-source{' '}
              <span className="font-semibold text-zinc-700">Deep Eye</span> engine (MIT License). Evaluates
              live application endpoints, headers, encryption, and injection surfaces with authorized consent.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  engineHealth?.available ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className="font-medium text-zinc-700">
                {engineHealth?.available ? 'Engine Ready' : 'Engine Unavailable'}
              </span>
              <button
                onClick={checkHealth}
                disabled={isCheckingHealth}
                className="text-zinc-400 hover:text-zinc-600 ml-1"
                title="Refresh engine health status"
              >
                <RefreshCw className={`w-3 h-3 ${isCheckingHealth ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Target Input & Authorization Box */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-xs space-y-5">
        <div className="border-b border-zinc-100 pb-3">
          <h2 className="text-sm font-bold text-zinc-900">Target Configuration & Authorization</h2>
          <p className="text-xs text-zinc-500">
            Specify the target web application endpoint. Testing is performed exclusively against authorized hosts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 flex items-center justify-between">
              <span>Target Application URL</span>
              <span className="text-xs text-zinc-400 font-normal">HTTP or HTTPS protocol required</span>
            </label>
            <div className="relative">
              <Server className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="http://127.0.0.1:3000/api/health"
                className="w-full pl-9 pr-4 py-2 text-xs font-mono rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-zinc-50/50"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-zinc-400">Quick Targets:</span>
              <button
                type="button"
                onClick={() => setTargetUrl('http://127.0.0.1:3000/api/health')}
                className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors font-mono"
              >
                /api/health (App API)
              </button>
              <button
                type="button"
                onClick={() => setTargetUrl('http://127.0.0.1:3000')}
                className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors font-mono"
              >
                / (Frontend)
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700">Audit Profile</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setScanMode('quick')}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                  scanMode === 'quick'
                    ? 'border-zinc-900 bg-zinc-900 text-white shadow-xs'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                Quick
              </button>
              <button
                type="button"
                onClick={() => setScanMode('standard')}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                  scanMode === 'standard'
                    ? 'border-zinc-900 bg-zinc-900 text-white shadow-xs'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setScanMode('full')}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                  scanMode === 'full'
                    ? 'border-zinc-900 bg-zinc-900 text-white shadow-xs'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                Full
              </button>
            </div>
            <p className="text-[11px] text-zinc-400">
              {scanMode === 'quick' && 'Evaluates headers, sensitive exposure, CORS, and primary endpoints (~15s).'}
              {scanMode === 'standard' && 'Comprehensive OWASP checks, redirects, and injection probes (~30s).'}
              {scanMode === 'full' && 'Deep heuristic crawling, multi-parameter testing, and extended modules (~60s).'}
            </p>
          </div>
        </div>

        {/* Mandatory Authorization Checkbox */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3.5 space-y-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              id="chk-authorize-security-validation"
              checked={authorized}
              onChange={(e) => setAuthorized(e.target.checked)}
              className="mt-0.5 rounded border-amber-300 text-zinc-900 focus:ring-zinc-900 h-4 w-4"
            />
            <div className="text-xs">
              <span className="font-semibold text-amber-950">
                I confirm and certify that I am explicitly authorized to security-test this target URL and environment.
              </span>
              <p className="text-amber-800 text-[11px] mt-0.5">
                Security testing without authorization is strictly prohibited. This engine performs automated defensive checks
                to identify vulnerabilities and produce remediation evidence.
              </p>
            </div>
          </label>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Lock className="w-3.5 h-3.5 text-zinc-400" />
            <span>Encrypted local runtime execution · Non-destructive defensive audit</span>
          </div>

          <button
            onClick={handleStartScan}
            disabled={!authorized || isScanning || !engineHealth?.available}
            id="btn-start-security-validation"
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-all ${
              !authorized || isScanning || !engineHealth?.available
                ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                : 'bg-zinc-900 text-white hover:bg-zinc-800'
            }`}
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Running Security Validation...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Security Validation</span>
              </>
            )}
          </button>
        </div>

        {scanError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{scanError}</span>
          </div>
        )}
      </div>

      {/* Live Scanner Terminal / Logs View */}
      {(isScanning || scanLogs.length > 0) && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden shadow-md">
          <div className="px-4 py-2.5 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-mono font-medium text-zinc-300">
                Deep Eye Scanner Console Stream
              </span>
            </div>
            {isScanning && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[11px] font-mono text-emerald-400">Scanning in progress...</span>
              </div>
            )}
          </div>
          <div className="p-4 font-mono text-[11px] text-zinc-300 max-h-48 overflow-y-auto space-y-1 scrollbar-thin">
            {scanLogs.map((line, idx) => (
              <div key={idx} className="leading-relaxed">
                <span className="text-zinc-500 select-none mr-2">&gt;</span>
                <span>{line}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* Assessment Status Bar & Prominent PDF Download Button */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-3.5 h-3.5 rounded-full shrink-0 ${
              summary ? 'bg-emerald-500 ring-4 ring-emerald-50' : 'bg-zinc-300'
            }`}
          />
          <div>
            <div className="text-xs font-bold text-zinc-900 flex items-center gap-2">
              <span>{summary ? 'Latest Assessment Completed' : 'Assessment Engine Ready'}</span>
              {summary && (
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-zinc-100 text-zinc-700 border border-zinc-200 font-semibold">
                  {summary.totalFindings} Findings Detected
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {summary
                ? `Audited target: ${summary.targetUrl} · ${(summary.durationMs / 1000).toFixed(1)}s elapsed · Deterministic Risk Evaluated`
                : 'No completed security assessment is available yet. Execute an authorized scan to generate a report.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleDownloadPdfReport}
            disabled={isGeneratingPdf || !summary || findings.length === 0}
            id="btn-download-security-report"
            title={!summary ? 'No completed security assessment is available.' : 'Generate and download complete PDF report'}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold shadow-xs transition-all ${
              !summary || findings.length === 0
                ? 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 active:scale-[0.99] cursor-pointer'
            }`}
          >
            {isGeneratingPdf ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
                <span>Generating Security Report...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Security Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* PDF Generation Status Alerts */}
      {pdfError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{pdfError}</span>
          </div>
          <button onClick={() => setPdfError(null)} className="text-rose-500 hover:text-rose-800 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {pdfSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{pdfSuccess}</span>
          </div>
          <button onClick={() => setPdfSuccess(null)} className="text-emerald-500 hover:text-emerald-800 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Summary Metrics (if available) */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
            <div className="text-xs font-medium text-zinc-500">Total Findings</div>
            <div className="text-2xl font-bold text-zinc-900 mt-1">{summary.totalFindings}</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">{(summary.durationMs / 1000).toFixed(1)}s elapsed</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-xs">
            <div className="text-xs font-medium text-rose-700">Critical</div>
            <div className="text-2xl font-bold text-rose-900 mt-1">{summary.criticalCount}</div>
            <div className="text-[11px] text-rose-500 mt-0.5">Immediate threat</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-xs">
            <div className="text-xs font-medium text-amber-700">High</div>
            <div className="text-2xl font-bold text-amber-900 mt-1">{summary.highCount}</div>
            <div className="text-[11px] text-amber-500 mt-0.5">Severe exposure</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-yellow-100 shadow-xs">
            <div className="text-xs font-medium text-yellow-700">Medium</div>
            <div className="text-2xl font-bold text-yellow-900 mt-1">{summary.mediumCount}</div>
            <div className="text-[11px] text-yellow-600 mt-0.5">Defensive hardening</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-xs">
            <div className="text-xs font-medium text-blue-700">Low</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">{summary.lowCount}</div>
            <div className="text-[11px] text-blue-500 mt-0.5">Best practice</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
            <div className="text-xs font-medium text-zinc-500">URLs Crawled</div>
            <div className="text-2xl font-bold text-zinc-900 mt-1">{summary.urlsCrawled}</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Targets validated</div>
          </div>
        </div>
      )}

      {/* Findings List Section */}
      {findings.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-zinc-900">
                Security Assessment Findings ({filteredFindings.length})
              </h3>
              <p className="text-xs text-zinc-500">
                Identified vulnerability signatures, missing security headers, and exposure points.
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPdfReport}
                disabled={isGeneratingPdf || !summary}
                title={!summary ? 'No completed assessment' : 'Download PDF report'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5 text-zinc-600" />
                <span className="hidden sm:inline">Export PDF</span>
              </button>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter findings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-md border border-zinc-200 bg-zinc-50/50 focus:outline-none focus:ring-1 focus:ring-zinc-900 w-48"
                />
              </div>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-md border border-zinc-200 bg-zinc-50/50 text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
                <option value="INFO">Info</option>
              </select>
            </div>
          </div>

          {/* List items */}
          <div className="divide-y divide-zinc-100">
            {filteredFindings.map((finding) => (
              <div
                key={finding.id}
                onClick={() => setSelectedFinding(finding)}
                className={`py-3.5 px-3 rounded-lg hover:bg-zinc-50/80 cursor-pointer transition-colors flex items-center justify-between gap-4 ${
                  selectedFinding?.id === finding.id ? 'bg-zinc-100/70' : ''
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase shrink-0 mt-0.5 ${getSeverityBadgeClass(
                      finding.severity
                    )}`}
                  >
                    {finding.severity}
                  </span>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-900">{finding.type}</span>
                      {finding.parameter && (
                        <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600">
                          param: {finding.parameter}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 truncate">{finding.description}</p>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono">
                      <span>{finding.url}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-zinc-400 font-medium group-hover:text-zinc-600 hidden sm:inline">
                    Inspect
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </div>
              </div>
            ))}

            {filteredFindings.length === 0 && (
              <div className="py-8 text-center text-xs text-zinc-400">
                No findings matching the selected filters.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Finding Detail Modal / Drawer */}
      {selectedFinding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/50">
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded border uppercase ${getSeverityBadgeClass(
                    selectedFinding.severity
                  )}`}
                >
                  {selectedFinding.severity}
                </span>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">{selectedFinding.type}</h3>
                  <p className="text-xs text-zinc-500 font-mono">{selectedFinding.url}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedFinding(null);
                  setAiExplanation(null);
                }}
                className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-md hover:bg-zinc-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Description */}
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Description</h4>
                <p className="text-xs text-zinc-800 leading-relaxed">{selectedFinding.description}</p>
              </div>

              {/* Evidence */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Recorded Evidence</h4>
                <div className="bg-zinc-900 text-zinc-200 p-3 rounded-lg font-mono text-xs overflow-x-auto border border-zinc-800">
                  {selectedFinding.evidence}
                </div>
              </div>

              {/* Parameter & Payload */}
              {(selectedFinding.parameter || selectedFinding.payload) && (
                <div className="grid grid-cols-2 gap-3 bg-zinc-50 p-3 rounded-lg border border-zinc-200 text-xs">
                  {selectedFinding.parameter && (
                    <div>
                      <span className="text-zinc-400 block font-medium text-[11px]">Parameter</span>
                      <span className="font-mono text-zinc-800 font-semibold">{selectedFinding.parameter}</span>
                    </div>
                  )}
                  {selectedFinding.payload && (
                    <div>
                      <span className="text-zinc-400 block font-medium text-[11px]">Audit Payload</span>
                      <span className="font-mono text-zinc-800 font-semibold truncate block">
                        {selectedFinding.payload}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Remediation */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Standard Remediation</h4>
                <div className="bg-emerald-50/60 border border-emerald-200 text-emerald-950 p-3 rounded-lg text-xs leading-relaxed">
                  {selectedFinding.remediation}
                </div>
              </div>

              {/* AI Defensive Mitigation & Architectural Guidance */}
              <div className="border-t border-zinc-200 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <h4 className="text-xs font-bold text-zinc-900">
                      Defensive Security AI Guidance
                    </h4>
                  </div>
                  {!aiExplanation && (
                    <button
                      onClick={() => handleRequestAiExplanation(selectedFinding)}
                      disabled={isExplaining}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-md transition-colors"
                    >
                      {isExplaining ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Analyzing Root Cause...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3" />
                          <span>Generate AI Mitigation</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {aiExplanation && (
                  <div className="space-y-3 bg-zinc-50 border border-zinc-200 rounded-lg p-4 text-xs">
                    <div>
                      <span className="font-semibold text-zinc-900 block mb-1">Root Cause Analysis</span>
                      <p className="text-zinc-700 leading-relaxed">{aiExplanation.rootCause}</p>
                    </div>

                    <div>
                      <span className="font-semibold text-zinc-900 block mb-1">Business & Threat Impact</span>
                      <p className="text-zinc-700 leading-relaxed">{aiExplanation.impactAnalysis}</p>
                    </div>

                    <div>
                      <span className="font-semibold text-zinc-900 block mb-1">Recommended Defensive Mitigation</span>
                      <pre className="p-3 bg-zinc-900 text-emerald-400 rounded-md font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                        {aiExplanation.defensiveMitigation}
                      </pre>
                    </div>

                    <div>
                      <span className="font-semibold text-zinc-900 block mb-1">Verification Instructions</span>
                      <p className="text-zinc-600 leading-relaxed">{aiExplanation.verificationGuidance}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400">
                Fingerprint: {selectedFinding.fingerprint || 'N/A'}
              </span>
              <button
                onClick={() => {
                  setSelectedFinding(null);
                  setAiExplanation(null);
                }}
                className="px-4 py-1.5 rounded-md text-xs font-medium text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SentinelAI Security Validation Assistant */}
      <SentinelAIChat
        currentSession={currentSession}
        summary={summary}
        findings={findings}
        targetUrl={currentSession?.targetUrl || targetUrl}
        selectedFinding={selectedFinding}
        onClearSelectedFinding={() => setSelectedFinding(null)}
      />
    </div>
  );
};
