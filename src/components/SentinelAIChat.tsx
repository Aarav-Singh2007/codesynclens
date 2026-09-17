import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  AlertTriangle,
  RefreshCw,
  Minus,
  Maximize2,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import {
  SecurityValidationFinding,
  SecurityValidationSummary,
  SecurityValidationSession,
} from '../types';

interface SentinelAIChatProps {
  currentSession: SecurityValidationSession | null;
  summary: SecurityValidationSummary | null;
  findings: SecurityValidationFinding[];
  targetUrl: string;
  selectedFinding: SecurityValidationFinding | null;
  onClearSelectedFinding?: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export const SentinelAIChat: React.FC<SentinelAIChatProps> = ({
  currentSession,
  summary,
  findings,
  targetUrl,
  selectedFinding,
  onClearSelectedFinding,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastSyncedSessionId, setLastSyncedSessionId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasCompletedScan = currentSession?.status === 'COMPLETED' || (findings && findings.length > 0);
  const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
  const highCount = findings.filter((f) => f.severity === 'HIGH').length;

  // Auto-scroll chat
  useEffect(() => {
    if (isOpen && !isMinimized && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // Focus input on open
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, isMinimized]);

  // Handle synchronization when a new completed scan occurs
  useEffect(() => {
    const currentId = currentSession?.id || (findings.length > 0 ? `${targetUrl}-${findings.length}` : null);

    if (currentId && currentId !== lastSyncedSessionId && hasCompletedScan) {
      setLastSyncedSessionId(currentId);

      // Reset conversation with fresh, synced context for the new assessment
      const welcomeMsg: ChatMessage = {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `I’m synced with your latest Security Validation assessment for **${targetUrl}** (${findings.length} findings: ${criticalCount} Critical, ${highCount} High).\n\nAsk me about vulnerabilities, evidence, impact, or remediation.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages([welcomeMsg]);
    } else if (!hasCompletedScan && messages.length === 0) {
      // Empty state
      setMessages([
        {
          id: 'initial-empty',
          role: 'assistant',
          content: 'Run a Security Validation assessment and I’ll help you understand the results, explain evidence, and prioritize remediations.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [currentSession?.id, findings.length, targetUrl, hasCompletedScan]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    if (!hasCompletedScan) {
      setMessages((prev) => [
        ...prev,
        {
          id: `usr-${Date.now()}`,
          role: 'user',
          content: query,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        {
          id: `ast-${Date.now()}`,
          role: 'assistant',
          content: 'No completed Security Validation assessment is currently available. Run a security assessment first.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setInputQuery('');
      return;
    }

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputQuery('');
    setIsLoading(true);

    try {
      const payload = {
        messages: newHistory
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role, content: m.content })),
        assessment: {
          targetUrl,
          timestamp: summary?.timestamp || currentSession?.id,
          scanMode: summary?.scanMode || 'quick',
          summary,
          findings,
          currentFinding: selectedFinding,
        },
      };

      const res = await fetch('/api/security-validation/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to communicate with SentinelAI');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ast-${Date.now()}`,
          role: 'assistant',
          content: data.reply || 'No additional details found in assessment.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ast-err-${Date.now()}`,
          role: 'assistant',
          content: 'SentinelAI is temporarily unavailable. Your security assessment is still available.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  return (
    <>
      {/* Floating Circular Trigger Button (Right side of Security Validation section) */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
        {!isOpen && (
          <div className="relative group">
            <button
              onClick={() => {
                setIsOpen(true);
                setIsMinimized(false);
              }}
              title="Ask SentinelAI about this assessment"
              id="btn-open-sentinel-ai"
              className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-zinc-900 text-white shadow-xl hover:bg-zinc-800 transition-all transform hover:-translate-y-0.5 border border-zinc-700/80 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2"
            >
              <div className="relative flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="absolute -inset-1 rounded-full bg-emerald-400/30 animate-ping" />
              </div>
              <div className="flex flex-col items-start text-left">
                <span className="text-xs font-bold tracking-tight">SentinelAI</span>
                <span className="text-[10px] text-zinc-400 font-normal leading-none">Security Assistant</span>
              </div>
            </button>

            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block whitespace-nowrap bg-zinc-900 text-white text-[11px] font-medium py-1 px-2.5 rounded-md shadow-lg border border-zinc-700 pointer-events-none">
              Ask SentinelAI about this assessment
            </div>
          </div>
        )}
      </div>

      {/* Floating Chat Panel */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 bg-white rounded-2xl shadow-2xl border border-zinc-200 transition-all duration-200 flex flex-col overflow-hidden ${
            isMinimized
              ? 'w-72 h-14'
              : 'w-full sm:w-[410px] h-[580px] max-h-[90vh]'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-zinc-900 text-white flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-emerald-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold tracking-tight text-white">SentinelAI</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                    DAST Assistant
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400">Security Validation Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Synchronized Status Pill */}
              <div className="px-3.5 py-2 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      hasCompletedScan ? 'bg-emerald-500' : 'bg-zinc-400'
                    }`}
                  />
                  <span className="font-medium text-zinc-700 truncate">
                    {hasCompletedScan
                      ? `Synced with Security Validation • ${findings.length} findings • ${criticalCount} Critical`
                      : 'No completed assessment available'}
                  </span>
                </div>
              </div>

              {/* Finding-aware active badge */}
              {selectedFinding && (
                <div className="px-3 py-1.5 bg-purple-50/80 border-b border-purple-200 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 truncate text-purple-900">
                    <Sparkles className="w-3 h-3 text-purple-600 shrink-0" />
                    <span className="font-semibold truncate">
                      Focused Finding: {selectedFinding.type} ({selectedFinding.severity})
                    </span>
                  </div>
                  {onClearSelectedFinding && (
                    <button
                      onClick={onClearSelectedFinding}
                      className="text-purple-600 hover:text-purple-800 text-[10px] underline ml-2 shrink-0"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {/* Messages Scroll Area */}
              <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs bg-zinc-50/30">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs shadow-2xs whitespace-pre-wrap leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-zinc-900 text-white rounded-br-xs'
                          : 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-xs'
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-zinc-400 px-1 mt-0.5">
                      {msg.timestamp}
                    </span>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-center gap-2 text-zinc-500 text-xs py-1 px-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-600" />
                    <span>SentinelAI is analyzing assessment findings...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Quick Prompt Chips */}
              {hasCompletedScan && (
                <div className="px-3 py-2 bg-white border-t border-zinc-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  {selectedFinding ? (
                    <>
                      <button
                        onClick={() => handleQuickPrompt(`Explain why ${selectedFinding.type} is ${selectedFinding.severity} and what an attacker could do.`)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 whitespace-nowrap transition-colors shrink-0"
                      >
                        Explain this finding
                      </button>
                      <button
                        onClick={() => handleQuickPrompt(`Provide exact technical remediation instructions with code or configuration to fix ${selectedFinding.type}.`)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap transition-colors shrink-0"
                      >
                        How do I fix this?
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleQuickPrompt('What are the most serious vulnerabilities in this assessment?')}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 whitespace-nowrap transition-colors shrink-0"
                      >
                        Most serious issues?
                      </button>
                      <button
                        onClick={() => handleQuickPrompt('Give me a prioritized remediation plan for these findings.')}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 whitespace-nowrap transition-colors shrink-0"
                      >
                        Remediation plan
                      </button>
                      <button
                        onClick={() => handleQuickPrompt('Summarize this security assessment for our engineering team.')}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 whitespace-nowrap transition-colors shrink-0"
                      >
                        Summarize assessment
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Chat Input Bar */}
              <div className="p-3 bg-white border-t border-zinc-200">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder={
                      hasCompletedScan
                        ? 'Ask about this assessment...'
                        : 'Run a security assessment first...'
                    }
                    disabled={isLoading}
                    className="flex-1 text-xs px-3 py-2 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-zinc-50/50"
                  />
                  <button
                    type="submit"
                    disabled={!inputQuery.trim() || isLoading}
                    id="btn-sentinel-send"
                    className={`p-2 rounded-lg text-white transition-colors ${
                      !inputQuery.trim() || isLoading
                        ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed'
                        : 'bg-zinc-900 hover:bg-zinc-800'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
                <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-400">
                  <span>Context strictly limited to current scan</span>
                  <span>SentinelAI Engine</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
