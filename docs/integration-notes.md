# External Repository Integration Notes

## 1. Modular Provider Philosophy
CodeLens treats external repositories as modular capability providers rather than monolithic foundations. The core review platform functions independently with its built-in AST and deterministic analyzer suite.

## 2. Skylos Adapter
- **Role**: Specialized capability provider for dead-code analysis, AST symbol pruning, and Python/TypeScript lint diagnostics.
- **Adapter Location**: `src/engine/providers/skylosAdapter.ts`
- **Availability Check**: Probes filesystem for `/skylos` directory or CLI binary in workspace.
- **Current Runtime Status**: Registered in registry as `UNAVAILABLE` until the repository is mounted or cloned into the container.
- **Truth In Execution**: When unavailable, CodeLens explicitly reports its unavailable state in the Integrations view. It never hallucinates or fabricates analyzer results.

## 3. Integrating Future External Repositories (Step-by-Step)
When a new repository is imported to add an engine (e.g. specialized language linter, container scanner):
1. **Inspect**: Determine execution interface (Node module, Python CLI, subprocess, or HTTP microservice).
2. **Implement**: Create an adapter implementing `ExternalCapabilityProvider` in `src/engine/providers/`.
3. **Register**: Add the adapter instance to `CapabilityRegistry.registerExternalProvider()`.
4. **Normalize**: Map the engine's raw findings into the standard `Finding` schema with appropriate `provenance.source` and `ruleId`.
5. **No UI Redesign**: The core review pipeline, filter views, and explanation engine will automatically ingest and display findings without UI changes.
