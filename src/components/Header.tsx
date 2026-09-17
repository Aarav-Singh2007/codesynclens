import React from 'react';
import { Shield, Cpu, Play, Plus, Code2 } from 'lucide-react';

interface HeaderProps {
  onNewAnalysis: () => void;
  onOpenIntegrations: () => void;
  onLoadDemo: () => void;
  analysisMode?: 'REAL' | 'DEMO' | null;
  hasActiveProject: boolean;
  activeView: 'code' | 'security';
  onSelectView: (view: 'code' | 'security') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNewAnalysis,
  onOpenIntegrations,
  onLoadDemo,
  analysisMode,
  hasActiveProject,
  activeView,
  onSelectView,
}) => {
  return (
    <header className="w-full border-b border-zinc-200 bg-white/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-semibold text-base shadow-sm">
            CL
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-900 text-lg tracking-tight">CodeLens</span>
              <span className="text-xs px-2 py-0.5 rounded border border-zinc-200 text-zinc-600 font-medium">
                AI Agent
              </span>
              {analysisMode && activeView === 'code' && (
                <span
                  className={`text-xs px-2 py-0.5 rounded font-medium border ${
                    analysisMode === 'DEMO'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  {analysisMode === 'DEMO' ? 'DEMO ANALYSIS' : 'REAL ANALYSIS'}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 hidden sm:block">
              Intelligent Code Review & Security Validation
            </p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center p-1 bg-zinc-100 rounded-lg border border-zinc-200/80 text-xs font-semibold">
          <button
            onClick={() => onSelectView('code')}
            id="tab-view-code"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeView === 'code'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-zinc-500" />
            <span>Code Review</span>
          </button>
          <button
            onClick={() => onSelectView('security')}
            id="tab-view-security"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeView === 'security'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-zinc-700" />
            <span>Security Validation</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenIntegrations}
            id="btn-nav-integrations"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-md transition-colors"
          >
            <Cpu className="w-3.5 h-3.5 text-zinc-500" />
            <span className="hidden md:inline">Providers & Registry</span>
            <span className="md:hidden">Providers</span>
          </button>

          {activeView === 'code' && (
            <>
              <button
                onClick={onLoadDemo}
                id="btn-nav-demo"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-md transition-colors"
                title="Analyze deterministic sample repository with realistic vulnerabilities"
              >
                <Play className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Run Demo Repo</span>
                <span className="sm:hidden">Demo</span>
              </button>

              <button
                onClick={onNewAnalysis}
                id="btn-nav-new-analysis"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-md shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{hasActiveProject ? 'New Scan' : 'Start Review'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
