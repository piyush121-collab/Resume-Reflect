import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Sparkles, File, Play } from 'lucide-react';

export function FileUpload({ onEvaluate, isLoading }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [candidateChoice, setCandidateChoice] = useState('A');
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (file) => {
    setErrorMsg(null);
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Invalid file format. Please upload a PDF file (.pdf only).');
      setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File size exceeds 10MB limit. Please upload a smaller PDF.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading) return; // Prevent double-clicking
    onEvaluate(selectedFile, candidateChoice);
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-4">
          <Sparkles size={14} /> AI Interview Panel Simulator
        </span>
        <h2 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl mb-3">
          Upload Candidate Resume
        </h2>
        <p className="text-slate-400 text-base max-w-xl mx-auto">
          Pass candidate resumes through a 7-agent AI evaluation pipeline featuring multi-agent debate and evidence-backed decision making.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sample Candidate Quick Selector */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <h4 className="text-sm font-semibold text-slate-200">Pre-loaded Hackathon Test Cases</h4>
            <p className="text-xs text-slate-400">Or quickly simulate with structured candidate dataset</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => { setCandidateChoice('A'); setSelectedFile(null); }}
              className={`flex-1 sm:flex-none px-4 py-2 text-xs font-medium rounded-lg transition border ${
                candidateChoice === 'A' && !selectedFile
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              Candidate A (Rohan M.)
            </button>
            <button
              type="button"
              onClick={() => { setCandidateChoice('B'); setSelectedFile(null); }}
              className={`flex-1 sm:flex-none px-4 py-2 text-xs font-medium rounded-lg transition border ${
                candidateChoice === 'B' && !selectedFile
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              Candidate B (Alex K.)
            </button>
          </div>
        </div>

        {/* Drag & Drop PDF Box */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-300 ${
            dragActive
              ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
              : selectedFile
              ? 'border-emerald-500/50 bg-emerald-500/5'
              : 'border-slate-800 bg-slate-900/50 hover:border-indigo-500/50 hover:bg-slate-900/80'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleChange}
            className="hidden"
            disabled={isLoading}
          />

          <div className="flex flex-col items-center justify-center gap-3">
            {selectedFile ? (
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <FileText size={32} />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Upload size={28} />
              </div>
            )}

            {selectedFile ? (
              <div>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400 mb-1">
                  <CheckCircle2 size={16} /> PDF Selected
                </span>
                <p className="text-base font-medium text-white">{selectedFile.name}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB — Click or drag to swap PDF
                </p>
              </div>
            ) : (
              <div>
                <p className="text-base font-medium text-slate-200">
                  Drag & Drop your candidate PDF resume here
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  or <span className="text-indigo-400 font-semibold underline underline-offset-2">browse files</span> (PDF format only, max 10MB)
                </p>
              </div>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-xs text-rose-300">
            <AlertCircle size={16} className="shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-4 px-6 rounded-xl font-bold text-sm tracking-wide text-white transition flex items-center justify-center gap-2 shadow-xl ${
            isLoading
              ? 'bg-indigo-800/60 cursor-not-allowed opacity-75'
              : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-600/30 hover:scale-[1.005]'
          }`}
        >
          <Play size={18} fill="currentColor" />
          {isLoading
            ? 'Processing Multi-Agent Evaluation...'
            : selectedFile
            ? `Run 7-Agent Evaluation on ${selectedFile.name}`
            : `Run 7-Agent Evaluation on Candidate ${candidateChoice}`}
        </button>
      </form>
    </div>
  );
}
