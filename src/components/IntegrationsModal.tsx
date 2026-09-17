import React, { useState, useEffect } from 'react';
import { CapabilityProviderInfo } from '../types';
import { RegisteredCapability } from '../engine/capabilityRegistry';
import { X, Cpu, CheckCircle2, AlertCircle, Clock, ExternalLink, RefreshCw, Shield } from 'lucide-react';

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [providers, setProviders] = useState<CapabilityProviderInfo[]>([]);
  const [capabilities, setCapabilities] = useState<RegisteredCapability[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'providers' | 'registry'>('providers');

  const fetchCapabilities = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/capabilities');
      const data = await res.json();
      if (res.ok) {
        setProviders(data.providers || []);
        setCapabilities(data.capabilities || []);
      }
    } catch (err) {
      console.error('Failed to load capability registry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCapabilities();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">Analysis Architecture & Providers</h3>
              <p className="text-xs text-zinc-500">Modular capability registry & external engine adapters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-md hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-zinc-200 bg-zinc-50 px-6 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('providers')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'providers'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Active & External Providers ({providers.length})
          </button>
          <button
            onClick={() => setActiveTab('registry')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'registry'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Capability Mapping Registry ({capabilities.length})
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-zinc-400" />
              <span>Querying capability providers...</span>
            </div>
          ) : activeTab === 'providers' ? (
            <div className="space-y-3">
              <p className="text-xs text-zinc-600">
                CodeLens is architected to decouple the review agent from any single tool. External repositories
                (like Skylos or security linters) integrate as pluggable providers without altering the product shell.
              </p>

              {providers.map((p) => {
                const isAvailable = p.status === 'AVAILABLE' || p.status === 'CONNECTED';
                return (
                  <div
                    key={p.id}
                    className="p-4 rounded-lg border border-zinc-200 bg-white hover:border-zinc-300 transition-colors space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-900 text-sm">{p.name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-100 text-zinc-600 font-mono">
                            {p.category}
                          </span>
                          {p.isExternal && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-800 font-semibold">
                              External Adapter
                            </span>
                          )}
                        </div>
                        <p className="text-zinc-500 text-xs mt-1 leading-relaxed">{p.description}</p>
                      </div>

                      <div className="shrink-0 text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isAvailable
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                          }`}
                        >
                          {isAvailable ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{p.status}</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-zinc-400" />
                              <span>{p.status}</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pt-2 border-t border-zinc-100 text-[11px] text-zinc-500">
                      <span>Capabilities: {p.capabilities.join(', ')}</span>
                      <span>Languages: {p.supportedLanguages.join(', ')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-zinc-600">
                Every analysis capability maps to one or more deterministic providers with transparent priority and deduplication.
              </p>
              {capabilities.map((cap) => (
                <div key={cap.id} className="p-3.5 rounded-lg border border-zinc-200 bg-zinc-50/50 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900">{cap.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-200 text-zinc-700 font-mono">{cap.id}</span>
                  </div>
                  <p className="text-zinc-600">{cap.description}</p>
                  <div className="pt-1 flex flex-wrap gap-2">
                    {cap.providers.map((prov) => (
                      <span
                        key={prov.id}
                        className="px-2 py-0.5 rounded bg-white border border-zinc-200 text-zinc-700 text-[11px] font-medium"
                      >
                        {prov.name} {prov.isPrimary ? '(Primary)' : '(Corroborating)'}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs text-zinc-500">
          <span>Adapter Protocol: v2.4 (TypeScript / REST / CLI Bridge)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-zinc-900 bg-white border border-zinc-300 hover:bg-zinc-100 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
