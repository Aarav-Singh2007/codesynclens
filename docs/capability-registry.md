# CodeLens Capability Registry

The Capability Registry governs all analytical features, mapping capabilities to built-in analyzers and external provider plugins.

| Capability | Primary Provider | Supporting Providers | Status | Integration Boundary |
| :--- | :--- | :--- | :--- | :--- |
| **Security Detection** | CodeLens Security Analyzer | Skylos Adapter | Available | In-process AST Regex Engine |
| **Secret Detection** | CodeLens Token Scanner | - | Available | High-entropy & Token Tokenizer |
| **Bug Detection** | CodeLens Bug Analyzer | - | Available | Control-flow & Syntax Analyzer |
| **Code Smell Detection**| CodeLens Quality Analyzer | Skylos Adapter | Available | Indentation & Signature Metrics |
| **Dead Code Elimination**| CodeLens Dead Code Pruner | Skylos Adapter | Available | Unreferenced Symbol Graph |
| **AI Explanation** | Gemini 3.8 Flash | - | Connected | Server-side `@google/genai` |
| **Fix Generation** | CodeLens Fix Engine | Gemini 3.8 Flash | Available | Template & Semantic Patching |
| **Verification** | CodeLens Verification Engine| - | Available | Re-analysis Verification Pass |

## Provider Contract
Every external provider implements the `ExternalCapabilityProvider` interface:
```typescript
interface ExternalCapabilityProvider {
  id: string;
  name: string;
  description: string;
  isExternal: boolean;
  supportedLanguages: string[];
  getCapabilities(): FindingCategory[];
  checkAvailability(): Promise<{ available: boolean; status: string; message: string }>;
  analyze(files: Record<string, string>): Promise<Finding[]>;
  getMetadata(): CapabilityProviderInfo;
}
```
New engines can be mounted by appending an adapter into `capabilityRegistry.registerExternalProvider(new MyEngineAdapter())`.
