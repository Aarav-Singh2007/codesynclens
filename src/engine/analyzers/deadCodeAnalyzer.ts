import { Finding } from '../../types';

export function runDeadCodeAnalysis(files: Record<string, string>): Finding[] {
  const findings: Finding[] = [];

  for (const [filePath, content] of Object.entries(files)) {
    if (filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.json')) continue;

    const lines = content.split('\n');

    // 1. Check for unreachable code after return / throw / break
    let justTerminated = false;
    let terminationLine = 0;

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
        return;
      }

      if (justTerminated) {
        // If line is closing brace or another case label, it terminates the block
        if (!trimmed.startsWith('}') && !trimmed.startsWith('case ') && !trimmed.startsWith('default:')) {
          const startContext = Math.max(0, idx - 2);
          const endContext = Math.min(lines.length - 1, idx + 1);
          findings.push({
            id: `dead-unreachable-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}-${lineNum}`,
            category: 'DEAD_CODE',
            title: 'Unreachable Statement After Control Termination',
            severity: 'LOW',
            confidence: 'HIGH',
            provenance: {
              source: 'Dead Code Analyzer',
              providerId: 'builtin-deadcode',
              ruleId: 'DEAD-001-UNREACHABLE-AFTER-RETURN',
              rawAnalyzerInfo: `Statement follows unconditional return/throw on line ${terminationLine}`
            },
            file: filePath,
            lineStart: lineNum,
            lineEnd: lineNum,
            codeSnippet: lines.slice(startContext, endContext + 1).join('\n'),
            evidence: `Statement '${trimmed.slice(0, 40)}' can never execute after line ${terminationLine}`,
            explanation: `Execution unconditionally terminates before reaching line ${lineNum}. Any code placed here is dead code.`,
            impact: 'Bloats codebase bundle size and misleads developers into believing logic is actively executing.',
            recommendation: 'Remove the unreachable code block or adjust control flow branches.',
            isAiObservation: false,
            status: 'OPEN'
          });
        }
        justTerminated = false;
      }

      if (/^(?:return\b|throw\b|break\s*;)/.test(trimmed)) {
        justTerminated = true;
        terminationLine = lineNum;
      } else if (trimmed.includes('{') || trimmed.includes('}')) {
        justTerminated = false;
      }
    });

    // 2. Redundant constant conditions: if (false), if (0)
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const falseMatch = /if\s*\(\s*(?:false|0|null|undefined)\s*\)/.exec(line);
      if (falseMatch) {
        const startContext = Math.max(0, idx - 1);
        const endContext = Math.min(lines.length - 1, idx + 2);
        findings.push({
          id: `dead-condition-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}-${lineNum}`,
          category: 'DEAD_CODE',
          title: `Dead Branch with Constant False Condition (${falseMatch[0]})`,
          severity: 'LOW',
          confidence: 'HIGH',
          provenance: {
            source: 'Dead Code Analyzer',
            providerId: 'builtin-deadcode',
            ruleId: 'DEAD-002-CONSTANT-FALSE-BRANCH',
            rawAnalyzerInfo: `Branch conditional evaluates statically to false`
          },
          file: filePath,
          lineStart: lineNum,
          lineEnd: lineNum,
          codeSnippet: lines.slice(startContext, endContext + 1).join('\n'),
          evidence: `Conditional expression '${falseMatch[0]}' guarantees block will never execute`,
          explanation: 'Condition statically resolves to false. The inner block is unreachable dead code.',
          impact: 'Dead code retention increases maintenance surface without delivering functional value.',
          recommendation: 'Remove the dead condition and its block or activate the intended dynamic predicate.',
          isAiObservation: false,
          status: 'OPEN'
        });
      }
    });

    // 3. Unused local helper functions (defined with private/local function or const, but zero callers elsewhere in the file)
    const localFunctionMatches = content.matchAll(/(?:function\s+([a-zA-Z0-9_]+)\s*\(|(?:const|let)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)/g);
    for (const fnMatch of localFunctionMatches) {
      const fnName = fnMatch[1] || fnMatch[2];
      // Skip exported functions, React components (uppercase), hooks (useX), handlers (onX, handleX), or main/default
      if (!fnName || /^[A-Z]/.test(fnName) || fnName.startsWith('use') || fnName.startsWith('on') || fnName.startsWith('handle') || fnName === 'main' || fnName === 'default') {
        continue;
      }
      // Check if exported
      const matchIndex = fnMatch.index || 0;
      const prefix = content.slice(Math.max(0, matchIndex - 15), matchIndex);
      if (prefix.includes('export')) {
        continue;
      }

      // Count occurrences of fnName in the entire file
      const nameRegex = new RegExp(`\\b${fnName}\\b`, 'g');
      const occurrences = (content.match(nameRegex) || []).length;
      if (occurrences === 1) {
        // Only defined, never called!
        const lineNum = content.slice(0, matchIndex).split('\n').length;
        const startContext = Math.max(0, lineNum - 2);
        const endContext = Math.min(lines.length - 1, lineNum + 2);

        findings.push({
          id: `dead-func-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}-${lineNum}`,
          category: 'DEAD_CODE',
          title: `Unused Local Function '${fnName}' (0 In-File References)`,
          severity: 'LOW',
          confidence: 'MEDIUM',
          provenance: {
            source: 'Dead Code Analyzer',
            providerId: 'builtin-deadcode',
            ruleId: 'DEAD-003-UNUSED-LOCAL-SYMBOL',
            rawAnalyzerInfo: `Symbol reference graph count is 1 (declaration only)`
          },
          file: filePath,
          lineStart: lineNum,
          lineEnd: lineNum,
          codeSnippet: lines.slice(startContext, endContext + 1).join('\n'),
          evidence: `Function '${fnName}' is declared locally but never called or exported`,
          explanation: `Symbol '${fnName}' has zero invocation call-sites in this module.`,
          impact: 'Superfluous code increases reading overhead and cognitive clutter.',
          recommendation: `Remove the unused function '${fnName}' or export it if intended for external consumption.`,
          isAiObservation: false,
          status: 'OPEN'
        });
      }
    }
  }

  return findings;
}
