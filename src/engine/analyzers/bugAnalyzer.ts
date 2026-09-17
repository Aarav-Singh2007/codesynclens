import { Finding, FindingSeverity } from '../../types';

interface BugRule {
  id: string;
  title: string;
  severity: FindingSeverity;
  pattern: RegExp;
  recommendation: string;
  impact: string;
  suggestedCodeTemplate?: (match: RegExpExecArray, lineContent: string) => string;
}

const BUG_RULES: BugRule[] = [
  {
    id: 'BUG-001-OFF-BY-ONE-INDEX',
    title: 'Off-By-One Array Boundary Iteration',
    severity: 'HIGH',
    pattern: /for\s*\(\s*(?:let|var|const)\s+[a-zA-Z0-9_]+\s*=\s*0\s*;\s*[a-zA-Z0-9_]+\s*<=\s*[a-zA-Z0-9_.]+\.length\s*;/i,
    recommendation: 'Use strict inequality (< array.length) or iterate using for..of to prevent out-of-bounds undefined access on array.length index.',
    impact: 'Accessing an index equal to array.length yields undefined, which will cause runtime TypeError when members are dereferenced.',
    suggestedCodeTemplate: (_match, line) => {
      return line.replace(/<=\s*([a-zA-Z0-9_.]+\.length)/, '< $1');
    }
  },
  {
    id: 'BUG-002-CONDITIONAL-ASSIGNMENT',
    title: 'Accidental Assignment Inside Conditional Expression',
    severity: 'HIGH',
    pattern: /if\s*\(\s*([a-zA-Z0-9_]+)\s*=\s*([^=][^)]*)\)/,
    recommendation: 'Use comparison operator (=== or ==) instead of assignment operator (=).',
    impact: 'Expression unconditionally overwrites the variable and evaluates to truthiness, causing branch logic to execute erroneously.',
    suggestedCodeTemplate: (_match, line) => {
      return line.replace(/if\s*\(\s*([a-zA-Z0-9_]+)\s*=\s*([^=][^)]*)\)/, 'if ($1 === $2)');
    }
  },
  {
    id: 'BUG-003-NAN-COMPARISON',
    title: 'Invalid NaN Comparison (x === NaN always evaluates to false)',
    severity: 'MEDIUM',
    pattern: /[a-zA-Z0-9_.]+\s*===?\s*NaN|NaN\s*===?\s*[a-zA-Z0-9_.]+/,
    recommendation: 'Use Number.isNaN(val) or isNaN(val) because IEEE 754 NaN does not equal itself.',
    impact: 'Conditional check will never evaluate to true, silently failing logic for invalid numeric inputs.',
    suggestedCodeTemplate: (match, line) => {
      const matchText = match[0];
      const varName = matchText.replace(/===?\s*NaN/, '').replace(/NaN\s*===?/, '').trim();
      return line.replace(matchText, `Number.isNaN(${varName})`);
    }
  },
  {
    id: 'BUG-004-UNHANDLED-FLOATING-PROMISE',
    title: 'Dangling Unhandled Async Promise Rejection',
    severity: 'MEDIUM',
    pattern: /(?:\.then\s*\([^)]+\)\s*;|\basync\s*\([^)]*\)\s*=>\s*\{[^}]*\breject\b)/,
    recommendation: 'Attach a .catch() handler or await within a try/catch block to avoid unhandled promise rejection process crashes.',
    impact: 'Uncaught asynchronous rejections can trigger unhandledRejection events and crash Node.js or destabilize client state.',
  },
  {
    id: 'BUG-005-TYPEOF-UNDEFINED-TYPO',
    title: 'Misspelled typeof Return String',
    severity: 'LOW',
    pattern: /typeof\s+[a-zA-Z0-9_.]+\s*===?\s*['"](?:undfined|nul|strng|functon|booean|nuber)['"]/i,
    recommendation: 'Correct the type string spelling (e.g. "undefined", "object", "string", "number", "boolean", "function").',
    impact: 'Conditional comparison will always evaluate to false, causing critical safety checks to be bypassed.',
  }
];

export function runBugAnalysis(files: Record<string, string>): Finding[] {
  const findings: Finding[] = [];

  for (const [filePath, content] of Object.entries(files)) {
    if (filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.svg')) continue;

    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

      for (const rule of BUG_RULES) {
        const match = rule.pattern.exec(line);
        if (match) {
          const id = `bug-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}-${lineNum}-${rule.id}`;
          const startContext = Math.max(0, idx - 2);
          const endContext = Math.min(lines.length - 1, idx + 2);
          const excerpt = lines.slice(startContext, endContext + 1).join('\n');

          const suggestedCode = rule.suggestedCodeTemplate ? rule.suggestedCodeTemplate(match, line) : undefined;

          findings.push({
            id,
            category: 'BUG',
            title: rule.title,
            severity: rule.severity,
            confidence: 'HIGH',
            provenance: {
              source: 'Deterministic Bug Analyzer',
              providerId: 'builtin-bugs',
              ruleId: rule.id,
              rawAnalyzerInfo: `Pattern syntax check matched rule ${rule.id} at line ${lineNum}`
            },
            file: filePath,
            lineStart: lineNum,
            lineEnd: lineNum,
            columnStart: match.index + 1,
            columnEnd: match.index + match[0].length + 1,
            codeSnippet: excerpt,
            evidence: `Suspicious expression construct '${match[0]}' on line ${lineNum}`,
            explanation: `Identified defect pattern matching ${rule.id}: ${rule.recommendation}`,
            impact: rule.impact,
            recommendation: rule.recommendation,
            suggestedCode,
            isAiObservation: false,
            status: 'OPEN'
          });
        }
      }
    });
  }

  return findings;
}
