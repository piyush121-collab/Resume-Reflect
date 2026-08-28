import React, { useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { Navbar } from './components/Navbar.jsx';
import { FileUpload } from './components/FileUpload.jsx';
import { LoadingPipeline } from './components/LoadingPipeline.jsx';
import { CandidateSummaryDashboard } from './components/CandidateSummaryDashboard.jsx';
import { DetailedAgentOutput } from './components/DetailedAgentOutput.jsx';
import { DebateViewer } from './components/DebateViewer.jsx';
import { ErrorMessage } from './components/ErrorMessage.jsx';
import { evaluateResume } from './api/evaluateApi.js';
import { Sparkles, MessageSquare, Award, ShieldCheck, RefreshCw } from 'lucide-react';

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [progressInfo, setProgressInfo] = useState(null);
  const [evaluationData, setEvaluationData] = useState(null);
  const [error, setError] = useState(null);
  const [activeViewSection, setActiveViewSection] = useState('agents'); // 'agents' | 'debate'

  const handleStartEvaluate = async (file, candidateChoice) => {
    setIsLoading(true);
    setError(null);
    setProgressInfo(null);

    try {
      const data = await evaluateResume(file, (progress) => {
        setProgressInfo(progress);
      }, candidateChoice);

      setEvaluationData(data);
    } catch (err) {
      console.error('[App evaluation failure]:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setEvaluationData(null);
    setError(null);
    setProgressInfo(null);
    setIsLoading(false);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
        {/* Sticky Header Navbar */}
        <Navbar onReset={handleReset} hasResults={!!evaluationData} />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
          
          {/* Error Banner / Screen */}
          {error && (
            <ErrorMessage error={error} onRetry={handleReset} />
          )}

          {/* Loading Non-blocking Progress Pipeline */}
          {isLoading && (
            <LoadingPipeline progressInfo={progressInfo} />
          )}

          {/* File Upload Zone (Shown when idle & no results) */}
          {!isLoading && !evaluationData && !error && (
            <FileUpload onEvaluate={handleStartEvaluate} isLoading={isLoading} />
          )}

          {/* Evaluation Results Output */}
          {!isLoading && evaluationData && (
            <div className="space-y-10 animate-fade-in">
              {/* Primary Candidate Summary Dashboard */}
              <CandidateSummaryDashboard evaluationData={evaluationData} />

              {/* View Selector Tabs (7-Agent Breakdown vs Debate Transcript) */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveViewSection('agents')}
                    className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition border ${
                      activeViewSection === 'agents'
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-850'
                    }`}
                  >
                    <Award size={16} /> 7-Agent Detailed Feedback
                  </button>

                  <button
                    onClick={() => setActiveViewSection('debate')}
                    className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition border ${
                      activeViewSection === 'debate'
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-850'
                    }`}
                  >
                    <MessageSquare size={16} /> Multi-Agent Debate Log ({evaluationData?.debateTurns?.length || 0} Turns)
                  </button>
                </div>

                <button
                  onClick={handleReset}
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  <RefreshCw size={14} /> New Evaluation
                </button>
              </div>

              {/* View 1: 7-Agent Feedback Breakdown */}
              {activeViewSection === 'agents' && (
                <DetailedAgentOutput evaluationData={evaluationData} />
              )}

              {/* View 2: Debate Transcript & Opinion Changes */}
              {activeViewSection === 'debate' && (
                <DebateViewer debateTurns={evaluationData?.debateTurns || []} />
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-900 py-6 px-6 text-center text-xs text-slate-500 bg-slate-950">
          <p>Interview Panel Simulator — Multi-Agent AI System • 7 Personas • Evidence-Grounded Hiring Evaluation</p>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
