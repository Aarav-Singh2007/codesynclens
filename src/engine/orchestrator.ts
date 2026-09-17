import { Finding, AnalysisSummary, FindingCategory, FindingSeverity } from '../types';
import { runSecurityAnalysis } from './analyzers/securityAnalyzer';
import { runBugAnalysis } from './analyzers/bugAnalyzer';
import { runCodeSmellAnalysis } from './analyzers/codeSmellAnalyzer';
import { runDeadCodeAnalysis } from './analyzers/deadCodeAnalyzer';
import { capabilityRegistry } from './capabilityRegistry';

export class AnalysisOrchestrator {
  /**
   * Main analysis execution pipeline
   */
  async analyzeCodebase(
    files: Record<string, string>,
    projectName: string = 'workspace-project',
    mode: 'REAL' | 'DEMO' = 'REAL'
  ): Promise<{ findings: Finding[]; summary: AnalysisSummary }> {
    const startTime = Date.now();
    const providersUsed: string[] = [];

    // 1. Run Built-in Analyzers
    const rawFindings: Finding[] = [];

    // Security & Secrets
    const secFindings = runSecurityAnalysis(files);
    rawFindings.push(...secFindings);
    if (secFindings.length > 0) {
      providersUsed.push('CodeLens Security Analyzer');
    }

    // Bugs & Defects
    const bugFindings = runBugAnalysis(files);
    rawFindings.push(...bugFindings);
    if (bugFindings.length > 0) {
      providersUsed.push('CodeLens Bug Analyzer');
    }

    // Code Smells & Maintainability
    const smellFindings = runCodeSmellAnalysis(files);
    rawFindings.push(...smellFindings);
    if (smellFindings.length > 0) {
      providersUsed.push('CodeLens Maintainability Engine');
    }

    // Dead Code
    const deadFindings = runDeadCodeAnalysis(files);
    rawFindings.push(...deadFindings);
    if (deadFindings.length > 0) {
      providersUsed.push('CodeLens Dead Code Engine');
    }

    // 2. Query External Capability Providers (e.g. Skylos)
    const externalProviders = capabilityRegistry.getAllExternalProviders();
    for (const extProvider of externalProviders) {
      const avail = await extProvider.checkAvailability();
      if (avail.available) {
        try {
          const extFindings = await extProvider.analyze(files);
          rawFindings.push(...extFindings);
          providersUsed.push(extProvider.name);
        } catch (err) {
          console.error(`External provider ${extProvider.name} execution failed:`, err);
        }
      }
    }

    // 3. Correlate and deduplicate findings across providers
    const deduplicatedFindings = this.correlateFindings(rawFindings);

    // 4. Calculate Summary Statistics
    let loc = 0;
    for (const content of Object.values(files)) {
      loc += content.split('\n').length;
    }

    const categoryCounts: Record<FindingCategory, number> = {
      BUG: 0,
      SECURITY: 0,
      SECRET: 0,
      CODE_SMELL: 0,
      DEAD_CODE: 0,
      DEPENDENCY: 0,
      AI_OBSERVATION: 0,
      OTHER: 0
    };

    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let infoCount = 0;

    for (const finding of deduplicatedFindings) {
      categoryCounts[finding.category] = (categoryCounts[finding.category] || 0) + 1;
      switch (finding.severity) {
        case 'CRITICAL':
          criticalCount++;
          break;
        case 'HIGH':
          highCount++;
          break;
        case 'MEDIUM':
          mediumCount++;
          break;
        case 'LOW':
          lowCount++;
          break;
        case 'INFO':
          infoCount++;
          break;
      }
    }

    const durationMs = Date.now() - startTime;

    const summary: AnalysisSummary = {
      projectName,
      analysisMode: mode,
      totalFiles: Object.keys(files).length,
      linesOfCode: loc,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      infoCount,
      categoryCounts,
      durationMs: Math.max(12, durationMs),
      providersUsed: providersUsed.length > 0 ? providersUsed : ['CodeLens Engine'],
      timestamp: new Date().toISOString()
    };

    return {
      findings: deduplicatedFindings,
      summary
    };
  }

  /**
   * Correlates and deduplicates findings from multiple providers targeting the same issue
   */
  private correlateFindings(findings: Finding[]): Finding[] {
    const result: Finding[] = [];
    const seenMap = new Map<string, Finding>();

    for (const finding of findings) {
      // Key by file + line range + category
      const key = `${finding.file}:${finding.lineStart}:${finding.category}`;

      if (seenMap.has(key)) {
        const existing = seenMap.get(key)!;
        // Merge provenance sources
        if (!existing.provenance.corroboratedBy) {
          existing.provenance.corroboratedBy = [];
        }
        if (!existing.provenance.corroboratedBy.includes(finding.provenance.source)) {
          existing.provenance.corroboratedBy.push(finding.provenance.source);
        }
        // Upgrade severity if higher
        existing.severity = this.pickHigherSeverity(existing.severity, finding.severity);
      } else {
        seenMap.set(key, { ...finding });
        result.push(seenMap.get(key)!);
      }
    }

    return result;
  }

  private pickHigherSeverity(a: FindingSeverity, b: FindingSeverity): FindingSeverity {
    const ranks: Record<FindingSeverity, number> = {
      CRITICAL: 5,
      HIGH: 4,
      MEDIUM: 3,
      LOW: 2,
      INFO: 1
    };
    return ranks[a] >= ranks[b] ? a : b;
  }
}

export const orchestrator = new AnalysisOrchestrator();
