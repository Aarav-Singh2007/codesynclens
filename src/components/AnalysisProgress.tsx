import React from 'react';
import { ShieldCheck, Loader2, CheckCircle2, Clock } from 'lucide-react';

interface AnalysisProgressProps {
  currentStage: string;
  stages: { id: string; label: string; status: 'pending' | 'running' | 'completed' }[];
  projectName: string;
}

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({
  stages,
  projectName
}) => {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-zinc-200 p-8 shadow-xs space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto text-zinc-900">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-900" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-900">Analyzing {projectName}</h2>
          <p className="text-xs text-zinc-500">
            Executing deterministic static rules and preparing intelligence report
          </p>
        </div>

        <div className="space-y-3 pt-2">
          {stages.map((stage) => {
            const isCompleted = stage.status === 'completed';
            const isRunning = stage.status === 'running';

            return (
              <div
                key={stage.id}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs transition-all ${
                  isRunning
                    ? 'bg-zinc-100/80 font-medium text-zinc-900 border border-zinc-300'
                    : isCompleted
                    ? 'text-zinc-600 bg-zinc-50/50'
                    : 'text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : isRunning ? (
                    <span className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-zinc-300 shrink-0" />
                  )}
                  <span>{stage.label}</span>
                </div>
                <span className="text-[10px] tracking-wide uppercase font-semibold">
                  {isCompleted ? 'Done' : isRunning ? 'In progress' : 'Queued'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
