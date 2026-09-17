import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import {
  SecurityValidationFinding,
  SecurityValidationSummary,
  SecurityValidationSession,
  FindingSeverity,
} from '../types';

export interface ScanOptions {
  scanMode?: 'quick' | 'standard' | 'full';
  enabledChecks?: string[];
  timeoutSeconds?: number;
}

export class SecurityValidationService {
  private baseDir: string;
  private deepEyeDir: string;
  private pythonPath: string = 'python3';

  constructor() {
    this.baseDir = process.cwd();
    this.deepEyeDir = path.join(this.baseDir, 'vendor', 'deep-eye');
  }

  /**
   * Checks if Python runtime and Deep Eye engine are present and operational.
   */
  async checkHealth(): Promise<{
    available: boolean;
    engineVersion?: string;
    pythonVersion?: string;
    message: string;
  }> {
    try {
      const scriptPath = path.join(this.deepEyeDir, 'deep_eye.py');
      if (!fs.existsSync(scriptPath)) {
        return {
          available: false,
          message: 'Deep Eye repository not found in vendor/deep-eye',
        };
      }

      // Check python execution
      const versionResult = await new Promise<{ ok: boolean; output: string }>((resolve) => {
        const p = spawn(this.pythonPath, [scriptPath, '--version']);
        let out = '';
        p.stdout.on('data', (d) => (out += d.toString()));
        p.stderr.on('data', (d) => (out += d.toString()));
        p.on('close', (code) => {
          resolve({ ok: code === 0, output: out.trim() });
        });
        p.on('error', (err) => {
          resolve({ ok: false, output: err.message });
        });
      });

      if (versionResult.ok) {
        return {
          available: true,
          engineVersion: versionResult.output || 'Deep Eye v1.4.0 (Hanzou)',
          message: 'Deep Eye Engine ready for authorized security audits',
        };
      }

      return {
        available: false,
        message: `Deep Eye check failed: ${versionResult.output}`,
      };
    } catch (err: any) {
      return {
        available: false,
        message: err.message || 'Error checking Deep Eye engine availability',
      };
    }
  }

  /**
   * Validates target URL format and safety, normalizing missing protocols and stripping wrapping quotes/brackets.
   */
  validateTargetUrl(rawUrl: string): { valid: boolean; normalized?: string; error?: string } {
    if (!rawUrl || typeof rawUrl !== 'string') {
      return { valid: false, error: 'Target URL is required. Please provide a valid HTTP or HTTPS endpoint (e.g. http://127.0.0.1:3000/api/health).' };
    }

    // Strip leading/trailing whitespace, quotes, markdown angle brackets
    let cleaned = rawUrl.trim().replace(/^["'`<]+|["'`>]+$/g, '').trim();

    if (!cleaned) {
      return { valid: false, error: 'Target URL is required.' };
    }

    // Reject carriage returns, newlines, or null bytes
    if (/[\r\n\0]/.test(cleaned)) {
      return { valid: false, error: 'Target URL contains prohibited newline or control characters.' };
    }

    // Disallow non-HTTP schemes like javascript:, file:, data:, ftp:, etc.
    const lower = cleaned.toLowerCase();
    const disallowedSchemes = ['javascript:', 'file:', 'data:', 'ftp:', 'ws:', 'wss:', 'ssh:', 'tel:', 'mailto:', 'blob:'];
    for (const scheme of disallowedSchemes) {
      if (lower.startsWith(scheme)) {
        return { valid: false, error: `Protocol "${scheme}" is not supported. Target URL must use http:// or https://.` };
      }
    }

    // Auto-prefix http:// if no protocol was supplied (e.g. "localhost:3000" or "127.0.0.1:3000/api")
    if (!/^https?:\/\//i.test(cleaned)) {
      if (cleaned.startsWith('//')) {
        cleaned = `http:${cleaned}`;
      } else {
        cleaned = `http://${cleaned}`;
      }
    }

    try {
      const parsed = new URL(cleaned);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { valid: false, error: 'Target URL must use http:// or https:// protocol.' };
      }

      // Ensure valid hostname
      if (!parsed.hostname || parsed.hostname.trim() === '') {
        return { valid: false, error: 'Target URL must include a valid host or domain name.' };
      }

      return { valid: true, normalized: parsed.toString() };
    } catch {
      return { valid: false, error: 'Invalid URL syntax. Please provide a well-formed URL (e.g. http://127.0.0.1:3000/api/health).' };
    }
  }

  /**
   * Runs an authorized defensive security audit against the target URL.
   */
  async runValidation(
    targetUrl: string,
    authorized: boolean,
    options: ScanOptions = {},
    onLog?: (log: string) => void
  ): Promise<{
    session: SecurityValidationSession;
    findings: SecurityValidationFinding[];
    summary: SecurityValidationSummary;
  }> {
    const startTime = Date.now();
    const sessionId = `sv-session-${Date.now()}`;
    const logs: string[] = [];

    const log = (msg: string) => {
      const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
      logs.push(line);
      if (onLog) onLog(line);
    };

    // 1. Mandatory authorization check
    if (!authorized) {
      throw new Error(
        'Authorization confirmation required. You must check the authorization box confirming you are permitted to security-test this target.'
      );
    }

    // 2. Validate URL
    const urlValidation = this.validateTargetUrl(targetUrl);
    if (!urlValidation.valid || !urlValidation.normalized) {
      throw new Error(urlValidation.error || 'Invalid target URL.');
    }
    const validatedUrl = urlValidation.normalized;

    log(`Initializing defensive security validation session for ${validatedUrl}`);
    log(`Authorization confirmed by user.`);

    const scriptPath = path.join(this.deepEyeDir, 'deep_eye.py');
    if (!fs.existsSync(scriptPath)) {
      throw new Error('Deep Eye security engine is not installed in vendor/deep-eye.');
    }

    // 3. Prepare run configuration
    const configPath = path.join(this.deepEyeDir, 'config', 'config.yaml');
    if (!fs.existsSync(configPath)) {
      const examplePath = path.join(this.deepEyeDir, 'config', 'config.example.yaml');
      if (fs.existsSync(examplePath)) {
        fs.copyFileSync(examplePath, configPath);
      }
    }

    const reportsDir = path.join(this.baseDir, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Remember existing reports to identify the new output file
    const existingReports = new Set(
      fs.existsSync(reportsDir) ? fs.readdirSync(reportsDir).filter((f) => f.endsWith('.json')) : []
    );

    const scanMode = options.scanMode || 'quick';
    const timeoutSeconds = options.timeoutSeconds || (scanMode === 'full' ? 90 : 30);

    const args = [
      scriptPath,
      '-u',
      validatedUrl,
      '-c',
      configPath,
      '--no-banner',
      '--formats',
      'json',
    ];

    log(`Launching Deep Eye scanner engine (Scan Mode: ${scanMode})...`);

    // 4. Execute scanner process safely
    const processResult = await new Promise<{ exitCode: number; stdout: string; stderr: string }>(
      (resolve) => {
        let stdout = '';
        let stderr = '';
        let timedOut = false;

        const child = spawn(this.pythonPath, args, {
          cwd: this.baseDir,
          env: {
            ...process.env,
            PYTHONUNBUFFERED: '1',
          },
        });

        const timer = setTimeout(() => {
          timedOut = true;
          log(`Scan process exceeded ${timeoutSeconds}s threshold; terminating gracefully.`);
          child.kill('SIGTERM');
          setTimeout(() => child.kill('SIGKILL'), 2000);
        }, timeoutSeconds * 1000);

        child.stdout.on('data', (data) => {
          const text = data.toString();
          stdout += text;
          const cleanLines = text
            .split('\n')
            .map((l: string) => l.replace(/\x1B\[[0-9;]*[mK]/g, '').trim())
            .filter((l: string) => l.length > 0 && !l.includes('━━━━'));
          cleanLines.forEach((l: string) => log(l));
        });

        child.stderr.on('data', (data) => {
          const text = data.toString();
          stderr += text;
          log(`[scanner warning] ${text.trim().slice(0, 200)}`);
        });

        child.on('close', (code) => {
          clearTimeout(timer);
          log(`Scanner execution completed with status code ${code}.`);
          resolve({ exitCode: code ?? (timedOut ? 124 : 0), stdout, stderr });
        });

        child.on('error', (err) => {
          clearTimeout(timer);
          log(`Scanner execution error: ${err.message}`);
          resolve({ exitCode: 1, stdout, stderr: err.message });
        });
      }
    );

    // 5. Locate newly generated report
    const currentReports = fs
      .readdirSync(reportsDir)
      .filter((f) => f.endsWith('.json'))
      .sort((a, b) => {
        const statA = fs.statSync(path.join(reportsDir, a));
        const statB = fs.statSync(path.join(reportsDir, b));
        return statB.mtimeMs - statA.mtimeMs;
      });

    let targetReportFile: string | null = null;
    for (const file of currentReports) {
      if (!existingReports.has(file)) {
        targetReportFile = file;
        break;
      }
    }

    // Fallback: pick newest report if none strictly new
    if (!targetReportFile && currentReports.length > 0) {
      targetReportFile = currentReports[0];
    }

    let rawData: any = null;
    if (targetReportFile) {
      const fullPath = path.join(reportsDir, targetReportFile);
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        rawData = JSON.parse(content);
        log(`Loaded security report from ${targetReportFile}`);
      } catch (err: any) {
        log(`Failed to parse report file ${targetReportFile}: ${err.message}`);
      }
    }

    // 6. Normalize findings
    const findings: SecurityValidationFinding[] = [];
    const rawVulns = Array.isArray(rawData?.vulnerabilities) ? rawData.vulnerabilities : [];

    rawVulns.forEach((v: any, idx: number) => {
      const sevStr = String(v.severity || 'medium').toUpperCase();
      let severity: FindingSeverity = 'MEDIUM';
      if (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].includes(sevStr)) {
        severity = sevStr as FindingSeverity;
      }

      findings.push({
        id: `sv-${idx + 1}-${v.fingerprint || Math.random().toString(36).substring(2, 8)}`,
        type: v.type || 'Security Assessment Issue',
        severity,
        url: v.url || validatedUrl,
        evidence: v.evidence || 'Discovered during active endpoint evaluation.',
        description: v.description || 'Security check identified potential exposure.',
        remediation: v.remediation || 'Apply defensive configuration hardening and input validation.',
        parameter: v.parameter,
        payload: v.payload,
        fingerprint: v.fingerprint,
        timestamp: new Date().toISOString(),
      });
    });

    const durationMs = Date.now() - startTime;

    // 7. Compute Summary
    const summary: SecurityValidationSummary = {
      targetUrl: validatedUrl,
      scanMode,
      totalFindings: findings.length,
      criticalCount: findings.filter((f) => f.severity === 'CRITICAL').length,
      highCount: findings.filter((f) => f.severity === 'HIGH').length,
      mediumCount: findings.filter((f) => f.severity === 'MEDIUM').length,
      lowCount: findings.filter((f) => f.severity === 'LOW').length,
      infoCount: findings.filter((f) => f.severity === 'INFO').length,
      urlsCrawled: rawData?.urls_crawled || 1,
      durationMs,
      timestamp: new Date().toISOString(),
      engineVersion: 'Deep Eye v1.4.0 (Hanzou)',
      stateBreakdown: rawData?.pentest_state?.attacks_by_type,
    };

    const session: SecurityValidationSession = {
      id: sessionId,
      targetUrl: validatedUrl,
      authorized: true,
      status: 'COMPLETED',
      currentPhase: 'Reporting',
      findings,
      summary,
      rawJsonPath: targetReportFile ? path.join('reports', targetReportFile) : undefined,
      logs,
    };

    log(`Security validation complete. Discovered ${findings.length} findings in ${(durationMs / 1000).toFixed(2)}s.`);

    return { session, findings, summary };
  }
}

export const securityValidationService = new SecurityValidationService();
