import express, { Request, Response } from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { orchestrator } from './src/engine/orchestrator';
import { capabilityRegistry } from './src/engine/capabilityRegistry';
import { fixVerifier } from './src/engine/fixVerifier';
import { Finding } from './src/types';

// Lazy initialized Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // 1. Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'CodeLens API',
      timestamp: new Date().toISOString(),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // 2. Capability Registry and Provider health
  app.get('/api/capabilities', async (_req: Request, res: Response) => {
    try {
      const providers = await capabilityRegistry.getAllProvidersInfo();
      const capabilities = capabilityRegistry.getCapabilityList();
      res.json({
        providers,
        capabilities,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retrieve capabilities' });
    }
  });

  // 3. Codebase Analysis Endpoint
  app.post('/api/analyze', async (req: Request, res: Response) => {
    try {
      const { files, projectName, mode } = req.body;
      if (!files || typeof files !== 'object' || Object.keys(files).length === 0) {
        return res.status(400).json({ error: 'No source files provided for analysis.' });
      }

      const result = await orchestrator.analyzeCodebase(
        files,
        projectName || 'project',
        mode === 'DEMO' ? 'DEMO' : 'REAL'
      );

      res.json(result);
    } catch (err: any) {
      console.error('Analysis error:', err);
      res.status(500).json({ error: err.message || 'Error occurred during code analysis.' });
    }
  });

  // 4. Gemini AI Explanation Engine (Server-side only)
  app.post('/api/explain', async (req: Request, res: Response) => {
    try {
      const { finding, contextCode } = req.body as { finding: Finding; contextCode?: string };
      if (!finding) {
        return res.status(400).json({ error: 'Finding object is required.' });
      }

      const ai = getGeminiClient();
      if (!ai) {
        // Fallback explanation grounded strictly in deterministic finding data
        return res.json({
          whyDetected: `Flagged under rule ${finding.provenance.ruleId || finding.category}: ${finding.title}`,
          whyMatters: finding.impact || 'Presents technical debt, security exposure, or potential runtime defect.',
          potentialImpact: finding.impact || 'May compromise system integrity or degrade maintainability.',
          recommendedChange: finding.recommendation || 'Refactor according to secure coding best practices.',
          exampleCode: finding.suggestedCode || null,
          aiGroundingNotice: 'Standard analyzer explanation (Gemini API key not configured in environment).',
        });
      }

      const prompt = `You are an expert developer security and code review assistant.
You are explaining an EXISTING analyzer finding.
DO NOT invent evidence.
DO NOT invent a rule ID.
DO NOT claim a scanner detected something that was not supplied.
If the evidence is insufficient, say so.

Finding Details:
- Title: ${finding.title}
- Category: ${finding.category}
- Severity: ${finding.severity}
- File: ${finding.file}:${finding.lineStart}
- Analyzer Source: ${finding.provenance.source} (${finding.provenance.ruleId || 'N/A'})
- Evidence: ${finding.evidence}
- Code Snippet:
\`\`\`
${finding.codeSnippet}
\`\`\`
${contextCode ? `Full Context Snippet:\n\`\`\`\n${contextCode}\n\`\`\`` : ''}

Respond with a JSON object strictly following this structure:
{
  "whyDetected": "1-2 clear technical sentences describing what triggered this finding",
  "whyMatters": "Clear explanation of the technical consequences and risks",
  "potentialImpact": "Specific real-world impact if deployed to production",
  "recommendedChange": "Concrete, actionable step-by-step guidance to resolve it",
  "exampleCode": "Clean, patched code snippet or null"
}`;

      const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
      let responseText = '';

      for (const modelName of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction: 'You are a professional code review intelligence assistant. You provide precise, mathematically and technically accurate code explanations. Return valid JSON only.',
              responseMimeType: 'application/json',
            },
          });
          if (response.text) {
            responseText = response.text;
            break;
          }
        } catch (mErr: any) {
          console.warn(`Model ${modelName} returned status ${mErr.status || mErr.code || mErr.message}, trying next candidate...`);
        }
      }
      try {
        const parsed = JSON.parse(responseText);
        return res.json(parsed);
      } catch {
        return res.json({
          whyDetected: `Triggered by ${finding.title}`,
          whyMatters: responseText,
          potentialImpact: finding.impact,
          recommendedChange: finding.recommendation,
          exampleCode: finding.suggestedCode,
        });
      }
    } catch (err: any) {
      console.error('Gemini explanation error:', err);
      res.json({
        whyDetected: `Triggered by rule ${req.body.finding?.provenance?.ruleId || 'N/A'}`,
        whyMatters: req.body.finding?.impact || 'Potential stability or security exposure.',
        potentialImpact: req.body.finding?.impact || 'Risk of runtime failure.',
        recommendedChange: req.body.finding?.recommendation || 'Apply recommended refactoring.',
        exampleCode: req.body.finding?.suggestedCode || null,
        aiGroundingNotice: 'Fallback generated due to upstream model timeout.',
      });
    }
  });

  // 5. Fix Verification Endpoint
  app.post('/api/verify', async (req: Request, res: Response) => {
    try {
      const { filePath, updatedContent, finding } = req.body;
      if (!filePath || !updatedContent || !finding) {
        return res.status(400).json({ error: 'filePath, updatedContent, and finding are required.' });
      }

      const verification = await fixVerifier.verifyFix(filePath, updatedContent, finding);
      res.json(verification);
    } catch (err: any) {
      console.error('Verification error:', err);
      res.status(500).json({ error: err.message || 'Verification process failed.' });
    }
  });

  // 6. GitHub Repository Ingestion Endpoint
  app.post('/api/github/fetch-repo', async (req: Request, res: Response) => {
    try {
      const { repoUrl, branch } = req.body;
      if (!repoUrl) {
        return res.status(400).json({ error: 'GitHub repository URL is required.' });
      }

      // Parse owner and repo name
      // e.g. https://github.com/facebook/react or github.com/owner/repo
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git|\/|$)/);
      if (!match) {
        return res.status(400).json({ error: 'Invalid GitHub URL format. Expected: https://github.com/owner/repo' });
      }

      const owner = match[1];
      const repo = match[2];
      const targetBranch = branch || 'main';

      // Fetch git tree from GitHub public API
      const headers: Record<string, string> = {
        'User-Agent': 'CodeLens-Review-Agent',
        'Accept': 'application/vnd.github.v3+json',
      };
      if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
      }

      const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`;
      const treeRes = await fetch(treeUrl, { headers });

      if (!treeRes.ok) {
        // Try fallback to 'master' branch if 'main' was 404
        if (treeRes.status === 404 && targetBranch === 'main') {
          const masterUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`;
          const masterRes = await fetch(masterUrl, { headers });
          if (masterRes.ok) {
            const masterData = await masterRes.json();
            return handleFetchedTree(owner, repo, 'master', masterData, res, headers);
          }
        }
        const errText = await treeRes.text();
        return res.status(treeRes.status).json({
          error: `GitHub API error (${treeRes.status}): ${treeRes.status === 403 ? 'Rate limit exceeded or repository is private. Set GITHUB_TOKEN in settings.' : 'Repository not found or branch does not exist.'}`,
          details: errText,
        });
      }

      const treeData = await treeRes.json();
      await handleFetchedTree(owner, repo, targetBranch, treeData, res, headers);
    } catch (err: any) {
      console.error('GitHub fetch error:', err);
      res.status(500).json({ error: err.message || 'Failed to fetch GitHub repository.' });
    }
  });

  async function handleFetchedTree(
    owner: string,
    repo: string,
    branch: string,
    treeData: any,
    res: Response,
    headers: Record<string, string>
  ) {
    if (!treeData.tree || !Array.isArray(treeData.tree)) {
      return res.status(400).json({ error: 'Repository tree is empty or inaccessible.' });
    }

    // Filter relevant source files (ts, js, py, go, java, json, etc. - skip binaries, images, package-locks)
    const validExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.json', '.sql', '.sh'];
    const candidates = treeData.tree.filter((item: any) => {
      if (item.type !== 'blob') return false;
      const p = item.path.toLowerCase();
      if (p.includes('node_modules/') || p.includes('.git/') || p.includes('dist/') || p.includes('build/')) {
        return false;
      }
      if (p.endsWith('package-lock.json') || p.endsWith('yarn.lock') || p.endsWith('bun.lock')) {
        return false;
      }
      return validExtensions.some(ext => p.endsWith(ext));
    });

    // Limit to first 25 key source files to stay performant and responsive
    const filesToFetch = candidates.slice(0, 25);
    const files: Record<string, string> = {};

    await Promise.all(
      filesToFetch.map(async (fileItem: any) => {
        try {
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${fileItem.path}`;
          const contentRes = await fetch(rawUrl, { headers });
          if (contentRes.ok) {
            const text = await contentRes.text();
            // Cap individual file size at 200KB
            if (text.length <= 200_000) {
              files[fileItem.path] = text;
            }
          }
        } catch {
          // ignore single file fetch failure
        }
      })
    );

    if (Object.keys(files).length === 0) {
      return res.status(400).json({
        error: 'No readable source files could be fetched from this repository branch.',
      });
    }

    res.json({
      repoName: `${owner}/${repo}`,
      branch,
      totalMatchedFiles: candidates.length,
      fetchedFilesCount: Object.keys(files).length,
      files,
    });
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CodeLens Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
