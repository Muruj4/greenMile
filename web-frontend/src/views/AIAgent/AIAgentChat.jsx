import React, { useState, useRef, useEffect } from 'react';

const initialMessage = `مرحبًا! أنا مساعدك الذكي في GreenMile 🌿

أقدر أساعدك في تحليل لوحة التحكم (Dashboard) والإجابة عن أسئلتك المتعلقة بالرحلات، الانبعاثات، والاستدامة.

كيف أقدر أساعدك اليوم؟

---

Hello! I'm your GreenMile AI Assistant 🌿

I can help you analyze your dashboard and answer questions about your trips, emissions, and sustainability.

How can I help you today?`;

const cleanText = (text) => {
  return text
    .replace(/##/g, '')
    .replace(/\*\*/g, '')
    .replace(/\n/g, '\n'); // keep line breaks
};

const renderMessageContent = (content) => {
  if (content.includes('---')) {
    return content.split('---').map((part, index) => (
      <div
        key={index}
        dir={index === 0 ? 'rtl' : 'ltr'}
        className="ai-message-part"
        style={{ marginBottom: '10px', whiteSpace: 'pre-line' }}
      >
        {cleanText(part.trim())}
      </div>
    ));
  }

  const hasArabic = /[\u0600-\u06FF]/.test(content);

  return (
    <div
      dir={hasArabic ? 'rtl' : 'ltr'}
      className="ai-message-part"
      style={{ whiteSpace: 'pre-line' }}
    >
      {cleanText(content)}
    </div>
  );
};

const AIAgentChat = ({ companyId, companyName, dashboardData, onClose }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: initialMessage,
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userText = inputText.trim();
    setInputText('');
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/ai-agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          company_name: companyName,
          message: userText,
          conversation_history: conversationHistory,
          dashboard_snapshot: dashboardData,
        }),
      });

      if (!response.ok) throw new Error('Server error');

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply },
      ]);

      setConversationHistory(data.updated_history);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'عذراً، لم أتمكن من الاتصال. يرجى المحاولة مرة أخرى.\n\n---\n\n⚠️ Sorry, I could not connect. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="ai-chat-window">
      <div className="ai-chat-header">
        <div className="ai-chat-header-left">
          <div className="ai-chat-avatar">🌿</div>
          <div>
            <div className="ai-chat-title">GreenMile Assistant</div>
            <div className="ai-chat-subtitle">
              Arabic & English • Powered by AI
            </div>
          </div>
        </div>

        <button
          className="ai-chat-close-btn"
          onClick={onClose}
          aria-label="Close chat"
        >
          ✕
        </button>
      </div>

      <div className="ai-chat-messages">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`ai-chat-message ${
              msg.role === 'user' ? 'user-message' : 'assistant-message'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="ai-chat-msg-avatar">🌿</div>
            )}

            <div className="ai-chat-bubble">
              {renderMessageContent(msg.content)}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="ai-chat-message assistant-message">
            <div className="ai-chat-msg-avatar">🌿</div>
            <div className="ai-chat-bubble loading-bubble">
              <span className="dot">●</span>
              <span className="dot">●</span>
              <span className="dot">●</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && (
        <div className="ai-chat-suggestions">
          <button
            className="suggestion-chip"
            onClick={() =>
              setInputText('What are my total CO2 emissions?')
            }
          >
            📊 Total emissions
          </button>

          <button
            className="suggestion-chip"
            onClick={() =>
              setInputText('كم عدد رحلاتي الخضراء؟')
            }
          >
            🟢 الرحلات الخضراء
          </button>

          <button
            className="suggestion-chip"
            onClick={() =>
              setInputText('How can I reduce my carbon footprint?')
            }
          >
            💡 Reduce emissions
          </button>
        </div>
      )}

      <div className="ai-chat-input-area">
        <textarea
          className="ai-chat-textarea"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything / اسألني عن أي شيء"
          rows={2}
          disabled={isLoading}
        />

        <button
          className="ai-chat-send-btn"
          onClick={sendMessage}
          disabled={isLoading || !inputText.trim()}
          aria-label="Send message"
        >
          ➤
        </button>
      </div>
    </div>
  );
};

export default AIAgentChat;