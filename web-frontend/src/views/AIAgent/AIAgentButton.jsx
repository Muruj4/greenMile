import React, { useState } from 'react';
import AIAgentChat from './AIAgentChat';
import './AIAgent.css';

const AIAgentButton = ({ companyId, companyName, dashboardData }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="ai-agent-wrapper">
      {isOpen && (
        <AIAgentChat
          companyId={companyId}
          companyName={companyName}
          dashboardData={dashboardData}
          onClose={() => setIsOpen(false)}
        />
      )}
      <button
        className="ai-agent-fab"
        onClick={() => setIsOpen(!isOpen)}
        title="GreenMile AI Assistant"
        aria-label="Open AI Assistant"
      >
        {isOpen ? '✕' : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>
    </div>
  );
};

export default AIAgentButton;