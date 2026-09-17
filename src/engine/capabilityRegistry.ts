import { CapabilityProviderInfo, FindingCategory } from '../types';
import { ExternalCapabilityProvider } from './providers/externalProvider';
import { SkylosAdapter } from './providers/skylosAdapter';

export interface RegisteredCapability {
  id: FindingCategory | 'FIX_GENERATION' | 'VERIFICATION' | 'AI_EXPLANATION';
  title: string;
  description: string;
  providers: {
    id: string;
    name: string;
    isPrimary: boolean;
    type: 'BUILTIN' | 'EXTERNAL' | 'AI_ASSISTED';
  }[];
}

class CapabilityRegistry {
  private externalProviders: Map<string, ExternalCapabilityProvider> = new Map();

  constructor() {
    // Register known external adapters
    const skylos = new SkylosAdapter();
    this.registerExternalProvider(skylos);
  }

  registerExternalProvider(provider: ExternalCapabilityProvider) {
    this.externalProviders.set(provider.id, provider);
  }

  getExternalProvider(id: string): ExternalCapabilityProvider | undefined {
    return this.externalProviders.get(id);
  }

  getAllExternalProviders(): ExternalCapabilityProvider[] {
    return Array.from(this.externalProviders.values());
  }

  getCapabilityList(): RegisteredCapability[] {
    return [
      {
        id: 'SECURITY',
        title: 'Security Vulnerability Detection',
        description: 'Detects injection attacks, unsanitized inputs, weak cryptography, and unsafe execution.',
        providers: [
          { id: 'builtin-security', name: 'CodeLens Security Analyzer', isPrimary: true, type: 'BUILTIN' },
          { id: 'skylos', name: 'Skylos Analyzer', isPrimary: false, type: 'EXTERNAL' }
        ]
      },
      {
        id: 'SECRET',
        title: 'Hardcoded Secret & Credential Detection',
        description: 'Scans for exposed API keys, private keys, authentication tokens, and credentials.',
        providers: [
          { id: 'builtin-security', name: 'CodeLens Token & Secret Scanner', isPrimary: true, type: 'BUILTIN' }
        ]
      },
      {
        id: 'BUG',
        title: 'Defect & Bug Detection',
        description: 'Identifies logic errors, array boundary violations, NaN errors, and unhandled promises.',
        providers: [
          { id: 'builtin-bugs', name: 'CodeLens Bug Analyzer', isPrimary: true, type: 'BUILTIN' }
        ]
      },
      {
        id: 'CODE_SMELL',
        title: 'Maintainability & Code Smell Analysis',
        description: 'Evaluates cognitive complexity, excessive parameter signatures, and deep nesting.',
        providers: [
          { id: 'builtin-quality', name: 'CodeLens Maintainability Engine', isPrimary: true, type: 'BUILTIN' },
          { id: 'skylos', name: 'Skylos Analyzer', isPrimary: false, type: 'EXTERNAL' }
        ]
      },
      {
        id: 'DEAD_CODE',
        title: 'Dead Code & Unused Symbol Elimination',
        description: 'Finds unreachable statements, unused local functions, and constant-false branching.',
        providers: [
          { id: 'builtin-deadcode', name: 'CodeLens Dead Code Pruner', isPrimary: true, type: 'BUILTIN' },
          { id: 'skylos', name: 'Skylos AST Scanner', isPrimary: false, type: 'EXTERNAL' }
        ]
      },
      {
        id: 'AI_EXPLANATION',
        title: 'AI Reasoning & Explanation Layer',
        description: 'Grounds deterministic evidence in developer-friendly root cause explanations and impact breakdowns.',
        providers: [
          { id: 'gemini-intelligence', name: 'Gemini 3.8 Flash (Server-Side)', isPrimary: true, type: 'AI_ASSISTED' }
        ]
      },
      {
        id: 'FIX_GENERATION',
        title: 'Patch & Remediation Generation',
        description: 'Generates non-destructive unified diff patches with explicit developer confirmation.',
        providers: [
          { id: 'codelens-fixer', name: 'CodeLens Fix Engine', isPrimary: true, type: 'BUILTIN' }
        ]
      },
      {
        id: 'VERIFICATION',
        title: 'Post-Remediation Verification',
        description: 'Re-analyzes patched source to confirm finding resolution and absence of regression.',
        providers: [
          { id: 'codelens-verifier', name: 'CodeLens Verification Engine', isPrimary: true, type: 'BUILTIN' }
        ]
      }
    ];
  }

  async getAllProvidersInfo(): Promise<CapabilityProviderInfo[]> {
    const builtin: CapabilityProviderInfo[] = [
      {
        id: 'builtin-security',
        name: 'CodeLens Security & Secret Analyzer',
        category: 'Deterministic Security AST',
        capabilities: ['SECURITY', 'SECRET'],
        status: 'AVAILABLE',
        version: '2.4.0',
        isExternal: false,
        description: 'Static AST regex token inspection for OWASP Top 10 vulnerabilities, injection flaws, and exposed credentials.',
        supportedLanguages: ['javascript', 'typescript', 'python', 'go', 'json']
      },
      {
        id: 'builtin-bugs',
        name: 'CodeLens Bug & Defect Analyzer',
        category: 'Static Defect Engine',
        capabilities: ['BUG'],
        status: 'AVAILABLE',
        version: '2.4.0',
        isExternal: false,
        description: 'Analyzes control flow, off-by-one bounds, unhandled asynchronous promises, and type comparison defects.',
        supportedLanguages: ['javascript', 'typescript', 'python']
      },
      {
        id: 'builtin-quality',
        name: 'CodeLens Maintainability & Smell Analyzer',
        category: 'Code Quality Metrics',
        capabilities: ['CODE_SMELL'],
        status: 'AVAILABLE',
        version: '2.4.0',
        isExternal: false,
        description: 'Measures cyclomatic complexity, parameter bombs, god functions, and deep nesting structures.',
        supportedLanguages: ['javascript', 'typescript', 'python', 'java']
      },
      {
        id: 'builtin-deadcode',
        name: 'CodeLens Dead Code Engine',
        category: 'Dead Code & Symbol Pruner',
        capabilities: ['DEAD_CODE'],
        status: 'AVAILABLE',
        version: '2.4.0',
        isExternal: false,
        description: 'Detects unreachable code post-termination, constant false branches, and unreferenced local functions.',
        supportedLanguages: ['javascript', 'typescript']
      },
      {
        id: 'gemini-intelligence',
        name: 'Gemini 3.8 Flash (AI Reasoning Engine)',
        category: 'Contextual AI Explanation',
        capabilities: ['AI_OBSERVATION'],
        status: 'CONNECTED',
        version: 'gemini-3.8-flash',
        isExternal: false,
        description: 'Server-side reasoning engine that translates deterministic findings into actionable developer guidance without fabricating evidence.',
        supportedLanguages: ['all']
      }
    ];

    const externalInfos: CapabilityProviderInfo[] = [];
    for (const provider of this.externalProviders.values()) {
      const meta = provider.getMetadata();
      const availability = await provider.checkAvailability();
      meta.status = availability.status;
      meta.description = `${meta.description} (${availability.message})`;
      externalInfos.push(meta);
    }

    return [...builtin, ...externalInfos];
  }
}

export const capabilityRegistry = new CapabilityRegistry();
