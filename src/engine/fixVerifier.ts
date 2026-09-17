import { Finding, VerificationResult } from '../types';
import { orchestrator } from './orchestrator';

export class FixVerifier {
  /**
   * Applies the proposed fix to the target file's content
   */
  applyFix(
    fileContent: string,
    finding: Finding
  ): { updatedContent: string; success: boolean; error?: string } {
    if (!finding.suggestedCode) {
      return {
        updatedContent: fileContent,
        success: false,
        error: 'No automated patch template is available for this finding. Please review recommendation.'
      };
    }

    const lines = fileContent.split('\n');
    const targetIdx = finding.lineStart - 1;

    if (targetIdx < 0 || targetIdx >= lines.length) {
      return {
        updatedContent: fileContent,
        success: false,
        error: `Target line ${finding.lineStart} out of bounds.`
      };
    }

    // Replace the line with suggestedCode
    lines[targetIdx] = finding.suggestedCode;
    const updatedContent = lines.join('\n');

    return {
      updatedContent,
      success: true
    };
  }

  /**
   * Verifies whether the fix resolved the issue by re-running analysis
   */
  async verifyFix(
    filePath: string,
    updatedContent: string,
    originalFinding: Finding
  ): Promise<VerificationResult> {
    const virtualFiles: Record<string, string> = {
      [filePath]: updatedContent
    };

    const reanalysis = await orchestrator.analyzeCodebase(virtualFiles, 'verification-pass');

    // Check if the finding or another finding on the same line still exists
    const matchingFinding = reanalysis.findings.find(
      f => f.file === filePath && f.category === originalFinding.category && Math.abs(f.lineStart - originalFinding.lineStart) <= 1
    );

    if (matchingFinding) {
      return {
        status: 'STILL_PRESENT',
        message: `Issue '${originalFinding.title}' is still flagged after applying patch. Additional manual refactoring required.`,
        verifiedAt: new Date().toISOString(),
        verifier: 'CodeLens Verification Engine',
        previousFindingId: originalFinding.id
      };
    }

    // Check if any new CRITICAL or HIGH findings were introduced
    const newHighFindings = reanalysis.findings.filter(
      f => f.severity === 'CRITICAL' || f.severity === 'HIGH'
    );

    if (newHighFindings.length > 0) {
      return {
        status: 'REGRESSION',
        message: `Original issue resolved, but new high-severity finding was introduced: ${newHighFindings[0].title}`,
        verifiedAt: new Date().toISOString(),
        verifier: 'CodeLens Verification Engine',
        previousFindingId: originalFinding.id
      };
    }

    return {
      status: 'VERIFIED',
      message: `Verified: ${originalFinding.title} has been completely eliminated from ${filePath}. Zero regression defects detected.`,
      verifiedAt: new Date().toISOString(),
      verifier: 'CodeLens Verification Engine',
      previousFindingId: originalFinding.id
    };
  }
}

export const fixVerifier = new FixVerifier();
