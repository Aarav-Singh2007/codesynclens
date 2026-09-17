import { ExternalCapabilityProvider } from './externalProvider';
import { Finding, FindingCategory, CapabilityProviderInfo } from '../../types';

export class SkylosAdapter implements ExternalCapabilityProvider {
  id = 'skylos';
  name = 'Skylos Analyzer';
  description = 'Open-source capability provider for dead-code pruning, AST symbol references, and static code diagnostics.';
  isExternal = true;
  supportedLanguages = ['python', 'typescript', 'javascript'];

  getCapabilities(): FindingCategory[] {
    return ['DEAD_CODE', 'CODE_SMELL', 'SECURITY'];
  }

  async checkAvailability(): Promise<{ available: boolean; status: CapabilityProviderInfo['status']; message: string }> {
    // Check if Skylos CLI or module is mounted in the filesystem
    // We check gracefully without crashing
    try {
      if (typeof window === 'undefined') {
        const fs = await import('fs');
        const path = await import('path');
        const skylosDir = path.resolve(process.cwd(), 'skylos');
        if (fs.existsSync(skylosDir)) {
          return {
            available: true,
            status: 'CONNECTED',
            message: 'Skylos directory detected in workspace. Ready for AST analysis.'
          };
        }
      }
    } catch {
      // In browser or sandbox without fs
    }

    return {
      available: false,
      status: 'UNAVAILABLE',
      message: 'Skylos repository is not mounted in the current workspace container. Adapter is registered and waiting for repository import.'
    };
  }

  async analyze(files: Record<string, string>): Promise<Finding[]> {
    const availability = await this.checkAvailability();
    if (!availability.available) {
      // Return empty array if not available - NEVER fake external analyzer output!
      return [];
    }

    // When Skylos is mounted, execute its parser or parse output
    const findings: Finding[] = [];
    return findings;
  }

  getMetadata(): CapabilityProviderInfo {
    return {
      id: this.id,
      name: this.name,
      category: 'Static Analysis & Dead Code',
      capabilities: this.getCapabilities(),
      status: 'UNAVAILABLE',
      version: '1.2.0-adapter',
      isExternal: true,
      description: this.description,
      supportedLanguages: this.supportedLanguages
    };
  }
}
