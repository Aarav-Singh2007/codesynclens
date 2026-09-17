# HackForge Requirements Compliance Matrix

This document maps all seven mandatory HackForge requirements and auxiliary criteria to their operational implementations in CodeLens.

| Requirement | Implementation Component | Verification Method | Status |
| :--- | :--- | :--- | :--- |
| **1. Source Code Input** | `InputHub.tsx`, `/api/github/fetch-repo`, ZIP file extraction | User can paste code, upload project archive (ZIP), or connect GitHub repo URL | Real & Functional |
| **2. Bug Detection** | `bugAnalyzer.ts` | Detects array boundary off-by-one errors, conditional assignments, NaN equality bugs, and unhandled floating promises | Real & Functional |
| **3. Security Issue Detection** | `securityAnalyzer.ts` | Detects hardcoded API keys/secrets, SQL injections via string concatenation, XSS sinks, weak hashing (MD5/SHA1), dangerous `eval` | Real & Functional |
| **4. Code Smell Detection** | `codeSmellAnalyzer.ts` | Evaluates parameter bomb signatures (>5 args), deep indentation nesting (>16 spaces), magic numbers, and god functions (>80 lines) | Real & Functional |
| **5. Severity Classification** | `AnalysisOrchestrator.ts`, Normalized `FindingSeverity` | Strict 5-tier classification (CRITICAL, HIGH, MEDIUM, LOW, INFO) grounded in exploitability and blast radius | Real & Functional |
| **6. Issue Explanation** | `server.ts` (`/api/explain`), Gemini 3.8 Flash | Generates structured explanations: Why Detected, Why It Matters, Potential Impact, and Actionable Steps | Real & Functional |
| **7. Suggested Improvements** | `FindingDetailModal.tsx`, `fixVerifier.ts` | Concrete code recommendations, template diffs, unified patch generator | Real & Functional |
| **Fix Generation & Verification** | `FixVerifier.ts`, `/api/verify` | Interactive diff review, explicit user apply button, re-analysis verification pass confirming defect elimination | Real & Functional |
| **Demo Repository** | `demoData.ts` | Curated multi-file codebase with intentional defects, clearly marked as `DEMO ANALYSIS` | Real & Functional |
| **External Adapter Architecture** | `capabilityRegistry.ts`, `skylosAdapter.ts` | Pluggable provider system with real availability tracking; does not hallucinate analyzer output | Real & Functional |
