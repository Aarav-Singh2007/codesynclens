import { Finding } from '../../types';

export function runCodeSmellAnalysis(files: Record<string, string>): Finding[] {
  const findings: Finding[] = [];

  for (const [filePath, content] of Object.entries(files)) {
    if (filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.json')) continue;

    const lines = content.split('\n');

    // 1. Check for excessive function parameter counts (> 5 parameters)
    const functionSignaturePattern = /(?:function\s+([a-zA-Z0-9_]+)|const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>)/g;
    let match: RegExpExecArray | null;

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;

      // Parameter count check
      const paramMatch = /function\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)|(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(([^)]+)\)/.exec(line);
      if (paramMatch) {
        const rawParams = (paramMatch[2] || paramMatch[4] || '').split(',').map(p => p.trim()).filter(Boolean);
        if (rawParams.length >= 6) {
          const fnName = paramMatch[1] || paramMatch[3] || 'anonymous';
          const startContext = Math.max(0, idx - 1);
          const endContext = Math.min(lines.length - 1, idx + 2);
          const excerpt = lines.slice(startContext, endContext + 1).join('\n');

          findings.push({
            id: `smell-param-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}-${lineNum}`,
            category: 'CODE_SMELL',
            title: `Excessive Function Parameters (${rawParams.length} arguments in '${fnName}')`,
            severity: 'MEDIUM',
            confidence: 'HIGH',
            provenance: {
              source: 'Maintainability Smell Analyzer',
              providerId: 'builtin-quality',
              ruleId: 'SMELL-001-PARAMETER-BOMB',
              rawAnalyzerInfo: `Signature parser identified ${rawParams.length} positional arguments`
            },
            file: filePath,
            lineStart: lineNum,
            lineEnd: lineNum,
            codeSnippet: excerpt,
            evidence: `Function '${fnName}' accepts ${rawParams.length} parameters (${rawParams.slice(0, 4).join(', ')}...)`,
            explanation: 'Functions with more than 4-5 positional parameters increase cognitive burden, make refactoring brittle, and increase test complexity.',
            impact: 'High coupling, error-prone call sites with argument order confusion, and difficult unit testing.',
            recommendation: 'Group parameters into a single typed Options or Context object (e.g. `function ' + fnName + '(options: ' + fnName.charAt(0).toUpperCase() + fnName.slice(1) + 'Options)`).',
            isAiObservation: false,
            status: 'OPEN'
          });
        }
      }

      // Deep nesting check (> 5 indent levels of 2 or 4 spaces)
      const indentSpaces = line.search(/\S/);
      if (indentSpaces >= 16 && (line.includes('if ') || line.includes('for ') || line.includes('while ') || line.includes('switch '))) {
        const startContext = Math.max(0, idx - 2);
        const endContext = Math.min(lines.length - 1, idx + 2);
        const excerpt = lines.slice(startContext, endContext + 1).join('\n');

        findings.push({
          id: `smell-nesting-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}-${lineNum}`,
          category: 'CODE_SMELL',
          title: 'Deep Indentation / Excessive Control Flow Nesting',
          severity: 'MEDIUM',
          confidence: 'HIGH',
          provenance: {
            source: 'Maintainability Smell Analyzer',
            providerId: 'builtin-quality',
            ruleId: 'SMELL-002-DEEP-NESTING',
            rawAnalyzerInfo: `Control statement at indentation level ${Math.floor(indentSpaces / 2)}`
          },
          file: filePath,
          lineStart: lineNum,
          lineEnd: lineNum,
          codeSnippet: excerpt,
          evidence: `Control flow deeply nested with ${indentSpaces} leading spaces (${Math.floor(indentSpaces / 2)} indent levels)`,
          explanation: 'Deeply nested logic creates high cyclomatic complexity (the Arrow Anti-pattern), making execution paths hard to trace and test.',
          impact: 'Significant cognitive load for maintainers, high bug density in nested edge cases, and reduced maintainability score.',
          recommendation: 'Use guard clauses with early returns (`if (!condition) return;`) or extract nested logic into focused helper functions.',
          isAiObservation: false,
          status: 'OPEN'
        });
      }

      // Hardcoded Magic Numbers in expressions
      if (/(?:===|!==|>|<|>=|<=)\s*(?:1000|86400|604800|3600000|99999)\b/.test(line)) {
        const magicMatch = /(?:===|!==|>|<|>=|<=)\s*(\d{4,})\b/.exec(line);
        if (magicMatch) {
          const startContext = Math.max(0, idx - 1);
          const endContext = Math.min(lines.length - 1, idx + 1);
          findings.push({
            id: `smell-magic-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}-${lineNum}`,
            category: 'CODE_SMELL',
            title: `Undocumented Magic Numeric Literal (${magicMatch[1]})`,
            severity: 'LOW',
            confidence: 'MEDIUM',
            provenance: {
              source: 'Maintainability Smell Analyzer',
              providerId: 'builtin-quality',
              ruleId: 'SMELL-003-MAGIC-NUMBER',
              rawAnalyzerInfo: `Literal ${magicMatch[1]} found in comparison without semantic constant binding`
            },
            file: filePath,
            lineStart: lineNum,
            lineEnd: lineNum,
            codeSnippet: lines.slice(startContext, endContext + 1).join('\n'),
            evidence: `Raw numeric constant '${magicMatch[1]}' used in comparison`,
            explanation: 'Magic numbers obscure the developer intent and make configuration difficult if the threshold changes in the future.',
            impact: 'Ambiguous business rules and regression risks when numbers are duplicated across modules.',
            recommendation: `Extract into a named descriptive constant (e.g. \`const TIMEOUT_MS = ${magicMatch[1]};\`).`,
            isAiObservation: false,
            status: 'OPEN'
          });
        }
      }
    });

    // 2. God Function Detection (> 80 lines)
    if (lines.length > 120) {
      // Find function blocks
      let currentFn: { name: string; start: number } | null = null;
      lines.forEach((line, idx) => {
        const fnMatch = /(?:function\s+([a-zA-Z0-9_]+)|const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{)/.exec(line);
        if (fnMatch) {
          if (currentFn && (idx - currentFn.start > 80)) {
            findings.push({
              id: `smell-godfn-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}-${currentFn.start + 1}`,
              category: 'CODE_SMELL',
              title: `Oversized Function '${currentFn.name}' (${idx - currentFn.start} lines)`,
              severity: 'MEDIUM',
              confidence: 'HIGH',
              provenance: {
                source: 'Maintainability Smell Analyzer',
                providerId: 'builtin-quality',
                ruleId: 'SMELL-004-GOD-FUNCTION',
                rawAnalyzerInfo: `Span between function definition and subsequent scope exceeds 80 lines`
              },
              file: filePath,
              lineStart: currentFn.start + 1,
              lineEnd: idx + 1,
              codeSnippet: lines.slice(currentFn.start, Math.min(lines.length, currentFn.start + 6)).join('\n') + '\n// ... (80+ lines) ...',
              evidence: `Function '${currentFn.name}' spans over 80 lines without modular extraction`,
              explanation: 'Large functions violate the Single Responsibility Principle, accumulating multiple disparate tasks that should be isolated.',
              impact: 'Dramatically increases the regression surface during edits and prevents straightforward unit test mocking.',
              recommendation: `Decompose '${currentFn.name}' into single-purpose modular functions.`,
              isAiObservation: false,
              status: 'OPEN'
            });
          }
          currentFn = { name: fnMatch[1] || fnMatch[2], start: idx };
        }
      });
    }
  }

  return findings;
}
