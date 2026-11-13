import React from 'react';
import { UtensilsCrossed, Database, Cpu, CheckCircle2, AlertCircle, FileSpreadsheet, BarChart3, History, Layers } from 'lucide-react';

interface HeaderProps {
  activeTab: 'planner' | 'history' | 'metrics' | 'aggregation' | 'import';
  setActiveTab: (tab: 'planner' | 'history' | 'metrics' | 'aggregation' | 'import') => void;
  isDbConnected: boolean;
  modelVersion?: string;
  onOpenRecordModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isDbConnected,
  modelVersion,
  onOpenRecordModal,
}) => {
  return (
    <header className="bg-white border-b border-ivory-border sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-forest flex items-center justify-center text-white shadow-xs">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-ink font-sans">LEFTOVER RADAR</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-forest-soft text-forest tracking-wider">
                  Campus Ops
                </span>
              </div>
              <p className="text-xs text-ink-muted">Cafeteria Demand & Prep Planner</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-ivory-subtle p-1 rounded-lg border border-ivory-border">
            <button
              onClick={() => setActiveTab('planner')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'planner'
                  ? 'bg-white text-forest shadow-xs font-semibold'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Demand Planner
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-white text-forest shadow-xs font-semibold'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Observations & Actuals
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'metrics'
                  ? 'bg-white text-forest shadow-xs font-semibold'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Model & Holdout
            </button>
            <button
              onClick={() => setActiveTab('aggregation')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'aggregation'
                  ? 'bg-white text-forest shadow-xs font-semibold'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              PyMongo Pipeline
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'import'
                  ? 'bg-white text-forest shadow-xs font-semibold'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              CSV Import
            </button>
          </nav>

          {/* Right Status & Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs border border-ivory-border rounded-md px-2.5 py-1 bg-ivory">
              <Database className="w-3.5 h-3.5 text-ink-muted" />
              <span className="text-ink-muted">MongoDB:</span>
              {isDbConnected ? (
                <span className="flex items-center gap-1 text-forest font-medium">
                  <CheckCircle2 className="w-3 h-3 text-forest" /> Active
                </span>
              ) : (
                <span className="flex items-center gap-1 text-radarRed font-medium">
                  <AlertCircle className="w-3 h-3" /> Offline
                </span>
              )}
            </div>

            <button
              onClick={onOpenRecordModal}
              className="px-3 py-1.5 bg-forest hover:bg-forest-hover text-white rounded-md text-xs font-medium transition-colors shadow-xs flex items-center gap-1.5"
            >
              Record Actuals
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
