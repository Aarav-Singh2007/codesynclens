import React from 'react';
import { Github, Upload, Code2, Play, ShieldAlert, Bug, Flame, Scale, Sparkles, CheckCircle2, Shield, ArrowRight } from 'lucide-react';

interface LandingHeroProps {
  onSelectMethod: (method: 'GITHUB' | 'UPLOAD' | 'PASTE') => void;
  onLoadDemo: () => void;
  onOpenSecurityValidation?: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onSelectMethod,
  onLoadDemo,
  onOpenSecurityValidation
}) => {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-3xl w-full text-center space-y-8">
        
        {/* Tagline Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Extensible Modular Analysis Architecture</span>
        </div>

        {/* Heading */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-zinc-900 leading-tight">
            Review your code before production does.
          </h1>
          <p className="text-lg sm:text-xl text-zinc-600 max-w-2xl mx-auto font-normal leading-relaxed">
            Find bugs, vulnerabilities, and code smells with deterministic static analysis and AI-assisted explanations.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => onSelectMethod('GITHUB')}
            id="btn-hero-github"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg shadow-sm transition-all"
          >
            <Github className="w-4 h-4" />
            <span>Connect GitHub</span>
          </button>

          <button
            onClick={() => onSelectMethod('UPLOAD')}
            id="btn-hero-upload"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium text-zinc-800 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg transition-all"
          >
            <Upload className="w-4 h-4 text-zinc-600" />
            <span>Upload Project (ZIP)</span>
          </button>

          <button
            onClick={() => onSelectMethod('PASTE')}
            id="btn-hero-paste"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium text-zinc-800 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg transition-all"
          >
            <Code2 className="w-4 h-4 text-zinc-600" />
            <span>Paste Code</span>
          </button>
        </div>

        {/* Security Validation Callout */}
        {onOpenSecurityValidation && (
          <div className="pt-1">
            <button
              onClick={onOpenSecurityValidation}
              id="btn-hero-security-validation"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900/5 hover:bg-zinc-900/10 border border-zinc-200 text-xs font-semibold text-zinc-800 transition-colors"
            >
              <Shield className="w-4 h-4 text-zinc-700" />
              <span>Launch Dynamic Security Validation (DAST Engine)</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
            </button>
          </div>
        )}

        {/* One-click Demo Button */}
        <div className="pt-1">
          <button
            onClick={onLoadDemo}
            id="btn-hero-demo-quick"
            className="text-xs text-zinc-600 hover:text-zinc-900 underline underline-offset-4 decoration-zinc-300 hover:decoration-zinc-800 transition-colors inline-flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 text-amber-600" />
            <span>Or explore the curated HackForge Demo Repository in 1-click</span>
          </button>
        </div>

        {/* Subtle Capability Line (Refined typography & icons, no giant cards) */}
        <div className="pt-12 border-t border-zinc-200 max-w-2xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-left">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-700">
              <Bug className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Bug Detection</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-700">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Security Analysis</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-700">
              <Flame className="w-4 h-4 text-orange-600 shrink-0" />
              <span>Code Smells</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-700">
              <Scale className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Severity Scoring</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-700">
              <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
              <span>AI Explanations</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Suggested Fixes</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
