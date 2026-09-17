# CodeLens Architecture

## Overview
CodeLens is an extensible, AI-augmented Code Review and Vulnerability Detection Agent built for developer security and engineering rigor. It couples high-precision deterministic static analysis engines (AST patterns, boundary analysis, vulnerability fingerprints) with a server-side Gemini 3.8 Flash intelligence layer.

```
+-------------------------------------------------------------------------------+
|                             CodeLens Web UI (React)                           |
|     Landing Page  |  Input Hub  |  Findings Explorer  |  Diff & Fix Verifier  |
+-------------------------------------------------------------------------------+
                                      |
                           (JSON API Requests /api/*)
                                      v
+-------------------------------------------------------------------------------+
|                       Express Backend API (server.ts)                         |
|   /api/analyze  |  /api/explain  |  /api/verify  |  /api/capabilities         |
+-------------------------------------------------------------------------------+
                                      |
                   +------------------+------------------+
                   v                                     v
+-------------------------------------+   +-------------------------------------+
|        Analysis Orchestrator        |   |      Gemini Intelligence Layer      |
|  - Multi-provider coordination      |   |  - Server-side @google/genai SDK    |
|  - Correlation & deduplication      |   |  - Strict anti-hallucination prompt |
|  - Provenance & evidence tracking   |   |  - Contextual root-cause breakdown  |
+-------------------------------------+   +-------------------------------------+
        |                   |
        v                   v
+----------------+  +-------------------------------+
| Built-in AST   |  | External Capability Providers |
| Analyzers      |  | - Skylos Adapter              |
| - Security     |  | - Future Engine Adapters      |
| - Bugs         |  |   (Container/CLI/API)         |
| - Quality      |  +-------------------------------+
| - Dead Code    |
+----------------+
```

## Architectural Principles
1. **Deterministic Ground Truth First**: Analyzers find verified problems with exact line numbers, syntax excerpts, and rule IDs. AI models explain and guide remediation; they are strictly forbidden from fabricating scanner evidence.
2. **Modular Provider Abstraction**: External analysis engines (such as Skylos or security linters) connect through standard `ExternalCapabilityProvider` contracts without modifying core UI or orchestration logic.
3. **Transparent Provenance**: Every finding displays which engine identified it (`source`), rule identifier (`ruleId`), and whether it was corroborated across multiple engines.
4. **Interactive Fix & Real Verification**: Proposed patches are inspected as side-by-side unified diffs, applied only upon explicit user approval, and immediately re-analyzed to verify elimination with zero regressions.
5. **Real vs Demo Distinction**: Deterministic demo codebases are clearly labeled `DEMO ANALYSIS` to allow complete jury demonstration even in sandboxed environments.
