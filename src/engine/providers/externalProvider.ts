import { Finding, FindingCategory, CapabilityProviderInfo } from '../../types';

export interface ExternalCapabilityProvider {
  id: string;
  name: string;
  description: string;
  isExternal: boolean;
  supportedLanguages: string[];
  
  getCapabilities(): FindingCategory[];
  checkAvailability(): Promise<{ available: boolean; status: CapabilityProviderInfo['status']; message: string }>;
  analyze(files: Record<string, string>): Promise<Finding[]>;
  getMetadata(): CapabilityProviderInfo;
}
