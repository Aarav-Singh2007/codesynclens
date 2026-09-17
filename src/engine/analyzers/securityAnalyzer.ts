import { Finding, FindingSeverity } from '../../types';

interface SecurityRule {
  id: string;
  title: string;
  severity: FindingSeverity;
  category: 'SECURITY' | 'SECRET';
  pattern: RegExp;
  recommendation: string;
  impact: string;
  suggestedCodeTemplate?: (match: RegExpExecArray, lineContent: string) => string;
}

const SECURITY_RULES: SecurityRule[] = [
  {
    id: 'SEC-001-HARDCODED-SECRET',
    title: 'Hardcoded Secret / API Key Detected',
    severity: 'CRITICAL',
    category: 'SECRET',
    pattern: /(?:api[_-]?key|secret|token|password|passwd|private[_-]?key)\s*[:=]\s*['"][A-Za-z0-9_\-+/=]{16,}['"]/i,
    recommendation: 'Move credentials and secrets to environment variables (e.g. process.env.API_KEY) and access them server-side only.',
    impact: 'Exposing credentials in source code leads to credential theft, account compromise, and unauthorized access to production resources.',
    suggestedCodeTemplate: (_match, line) => {
      return line.replace(/['"][A-Za-z0-9_\-+/=]{16,}['"]/, 'process.env.API_SECRET_KEY || ""');
    }
  },
  {
    id: 'SEC-002-SQL-INJECTION',
    title: 'Potential SQL Injection via String Interpolation',
    severity: 'CRITICAL',
    category: 'SECURITY',
    pattern: /(?:query|execute|raw|db\.\w+)\s*\(\s*`[^`]*(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)[^`]*\$\{/i,
    recommendation: 'Use parameterized queries or prepared statements instead of template string concatenation.',
    impact: 'Attackers can manipulate SQL query logic to bypass authentication, dump database records, or drop tables.',
    suggestedCodeTemplate: (_match, line) => {
      return line.replace(/\$\{[^}]+\}/, '? /* parameterized argument */');
    }
  },
  {
    id: 'SEC-003-UNSAFE-EVAL',
    title: 'Dangerous Dynamic Code Execution (eval / Function)',
    severity: 'HIGH',
    category: 'SECURITY',
    pattern: /\b(?:eval|new\s+Function|execSync|child_process\.exec)\s*\(/,
    recommendation: 'Avoid arbitrary runtime code evaluation. Use static parsers, JSON.parse, or strict sandboxed utility handlers.',
    impact: 'Remote Code Execution (RCE) allowing unauthorized command execution on the host server.',
  },
  {
    id: 'SEC-004-DANGEROUS-HTML',
    title: 'Unsanitized HTML Injection (XSS Risk)',
    severity: 'HIGH',
    category: 'SECURITY',
    pattern: /(?:dangerouslySetInnerHTML|innerHTML\s*=|\.outerHTML\s*=)/,
    recommendation: 'Sanitize untrusted input with a DOMPurify library or use standard text content bindings.',
    impact: 'Stored or reflected Cross-Site Scripting (XSS) allowing session hijacking and malicious script execution in victim browsers.',
  },
  {
    id: 'SEC-005-WEAK-HASHING',
    title: 'Weak Cryptographic Hashing Algorithm (MD5 / SHA1)',
    severity: 'MEDIUM',
    category: 'SECURITY',
    pattern: /createHash\s*\(\s*['"](?:md5|sha1)['"]\s*\)/i,
    recommendation: 'Use modern collision-resistant hash algorithms such as SHA-256 or bcrypt/argon2 for passwords.',
    impact: 'MD5 and SHA-1 suffer from known collision vulnerabilities, enabling credential cracking and signature spoofing.',
    suggestedCodeTemplate: (_match, line) => {
      return line.replace(/['"](?:md5|sha1)['"]/i, '"sha256"');
    }
  },
  {
    id: 'SEC-006-INSECURE-CORS',
    title: 'Permissive Insecure Wildcard CORS with Credentials',
    severity: 'MEDIUM',
    category: 'SECURITY',
    pattern: /origin\s*:\s*['"]\*['"].*credentials\s*:\s*true/i,
    recommendation: 'Specify exact allowed origin domains rather than wildcard * when credentials flag is enabled.',
    impact: 'Allows malicious third-party websites to make authenticated cross-origin requests on behalf of legitimate users.',
  },
  {
    id: 'SEC-007-INSECURE-RANDOM',
    title: 'Insecure Pseudo-Random Number Generator for Security Context',
    severity: 'LOW',
    category: 'SECURITY',
    pattern: /(?:token|nonce|salt|secret|session|auth)\w*\s*=\s*.*Math\.random\(\)/i,
    recommendation: 'Use cryptographically secure random number generators such as crypto.randomBytes() or crypto.getRandomValues().',
    impact: 'Math.random() is mathematically predictable, enabling attackers to guess generated tokens or session IDs.',
  }
];

export function runSecurityAnalysis(files: Record<string, string>): Finding[] {
  const findings: Finding[] = [];

  for (const [filePath, content] of Object.entries(files)) {
    // Skip binary / non-code files
    if (filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.svg') || filePath.endsWith('.ico')) {
      continue;
    }

    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      // Skip pure comment lines
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
        return;
      }

      for (const rule of SECURITY_RULES) {
        const match = rule.pattern.exec(line);
        if (match) {
          const id = `sec-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}-${lineNum}-${rule.id}`;
          const startContext = Math.max(0, idx - 2);
          const endContext = Math.min(lines.length - 1, idx + 2);
          const excerpt = lines.slice(startContext, endContext + 1).join('\n');

          const suggestedCode = rule.suggestedCodeTemplate ? rule.suggestedCodeTemplate(match, line) : undefined;

          findings.push({
            id,
            category: rule.category,
            title: rule.title,
            severity: rule.severity,
            confidence: 'HIGH',
            provenance: {
              source: 'Built-in Security Analyzer',
              providerId: 'builtin-security',
              ruleId: rule.id,
              rawAnalyzerInfo: `Static AST regex token inspection matched ${rule.pattern.toString()} at line ${lineNum}`
            },
            file: filePath,
            lineStart: lineNum,
            lineEnd: lineNum,
            columnStart: match.index + 1,
            columnEnd: match.index + match[0].length + 1,
            codeSnippet: excerpt,
            evidence: `Found pattern '${match[0].slice(0, 45)}${match[0].length > 45 ? '...' : ''}' on line ${lineNum}`,
            explanation: `Deterministic security scanner identified a potential vulnerability matching rule ${rule.id}. ${rule.recommendation}`,
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
