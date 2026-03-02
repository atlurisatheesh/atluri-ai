/**
 * In-Session Issue Reporter
 * 
 * Floating button that lets users report problems in real-time.
 * Auto-attaches session context to every report.
 */

'use client';

import React, { useState } from 'react';
import { getBetaTelemetry } from '../lib/beta_telemetry';

interface IssueReport {
  sessionId: string;
  userId: string;
  timestamp: number;
  issueType: 'freeze' | 'wrong_suggestion' | 'audio_issue' | 'other';
  description: string;
  browserInfo: string;
  recentEvents: unknown[];
}

interface IssueReporterProps {
  sessionId: string;
  userId: string;
}

export function IssueReporter({ sessionId, userId }: IssueReporterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<IssueReport['issueType'] | null>(null);
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const issueTypes = [
    { value: 'freeze', label: 'App froze', icon: '🥶' },
    { value: 'wrong_suggestion', label: 'Suggestion was wrong', icon: '❌' },
    { value: 'audio_issue', label: "Audio didn't work", icon: '🔇' },
    { value: 'other', label: 'Other issue', icon: '🤔' },
  ];

  const handleSubmit = async () => {
    if (!selectedType) return;

    const telemetry = getBetaTelemetry();
    
    const report: IssueReport = {
      sessionId,
      userId,
      timestamp: Date.now(),
      issueType: selectedType,
      description,
      browserInfo: navigator.userAgent,
      recentEvents: [], // Would attach from telemetry if available
    };

    try {
      await fetch('/api/v1/telemetry/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
      
      // Also store locally
      localStorage.setItem(`issue_${Date.now()}`, JSON.stringify(report));
      
      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setSelectedType(null);
        setDescription('');
      }, 2000);
    } catch (error) {
      console.error('Failed to submit issue:', error);
      localStorage.setItem(`issue_${Date.now()}`, JSON.stringify(report));
      setSubmitted(true);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center text-xl transition-transform hover:scale-110 z-40"
        title="Report an issue"
      >
        !
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 sm:items-center">
          <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-gray-900">Report an Issue</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-gray-600">Thanks! We'll look into it.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-4">
                    What went wrong?
                  </p>

                  {/* Issue Type Buttons */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {issueTypes.map(type => (
                      <button
                        key={type.value}
                        onClick={() => setSelectedType(type.value as IssueReport['issueType'])}
                        className={`p-3 rounded-lg border-2 text-left transition
                          ${selectedType === type.value 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                      >
                        <span className="text-lg mr-1">{type.icon}</span>
                        <span className="text-sm text-gray-700">{type.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Optional Description */}
                  {selectedType && (
                    <>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Any details? (optional)"
                        className="w-full border rounded-lg p-3 h-20 text-sm mb-4 focus:ring-2 focus:ring-blue-500"
                      />

                      <button
                        onClick={handleSubmit}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
                      >
                        Send Report
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
