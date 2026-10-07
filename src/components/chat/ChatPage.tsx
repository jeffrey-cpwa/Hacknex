import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AnswerCard } from './AnswerCard';
import {
  Send,
  Paperclip,
  Shield,
  Cpu,
} from 'lucide-react';

export const ChatPage: React.FC = () => {
  const {
    chatMessages,
    isThinking,
    currentThinkingStep,
    sendChatMessage,
  } = useApp();

  const [inputQuery, setInputQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isThinking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || isThinking) return;
    sendChatMessage(inputQuery.trim());
    setInputQuery('');
  };

  const hasUserMessages = chatMessages.some((m) => m.sender === 'user');

  return (
    <div style={styles.container}>
      {/* Main Conversation Stream / Clean Empty State */}
      <div style={styles.chatStream}>
        {!hasUserMessages ? (
          /* Clean Minimal Empty State - No suggestion cards */
          <div style={styles.emptyStateContainer}>
            <div style={styles.heroLogoBox}>
              <Shield size={28} color="#F59E0B" strokeWidth={2.2} />
            </div>
            <h2 style={styles.heroTitle}>CCTV ANALYSIS</h2>
            <p style={styles.heroSubTitle}>Ask anything about your footage.</p>
            <p style={styles.heroDesc}>
              Understand what happened, when it happened, and how events are connected.
            </p>
          </div>
        ) : (
          /* Render Conversation Messages */
          chatMessages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                style={{
                  ...styles.messageRow,
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    ...styles.messageBubble,
                    ...(isUser ? styles.userBubble : styles.aiBubble),
                  }}
                >
                  <div style={styles.bubbleHeader}>
                    <span style={styles.senderName}>
                      {isUser ? 'INVESTIGATOR' : 'CCTV ANALYSIS AI'}
                    </span>
                    <span style={styles.msgTime}>{msg.timestamp}</span>
                  </div>

                  <div style={styles.msgText}>{msg.text}</div>

                  {!isUser && msg.answerData && <AnswerCard message={msg} />}
                </div>
              </div>
            );
          })
        )}

        {/* AI Thinking Simulation Box */}
        {isThinking && (
          <div style={styles.thinkingContainer}>
            <div style={styles.thinkingSpinnerBox}>
              <Cpu size={15} color="#F59E0B" />
            </div>
            <div style={styles.thinkingTextContainer}>
              <div style={styles.thinkingTitle}>Analyzing footage events...</div>
              <div style={styles.thinkingStep}>{currentThinkingStep}</div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Bottom Input Area */}
      <div style={styles.inputContainer}>
        <form onSubmit={handleSubmit} style={styles.formRow}>
          <button
            type="button"
            onClick={() => alert('Attach evidence frame or clip')}
            style={styles.inputToolBtn}
            title="Attach Evidence"
          >
            <Paperclip size={15} />
          </button>

          <input
            type="text"
            placeholder="Ask about this footage..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={isThinking}
            style={styles.queryInput}
            autoFocus
          />

          <button
            type="submit"
            disabled={!inputQuery.trim() || isThinking}
            className="btn btn-primary"
            style={styles.sendBtn}
          >
            <Send size={13} />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#08090B',
    position: 'relative',
    overflow: 'hidden',
  },
  chatStream: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  emptyStateContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 'auto 0',
    padding: '40px 20px',
    textAlign: 'center',
  },
  heroLogoBox: {
    width: '52px',
    height: '52px',
    borderRadius: '12px',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    border: '1px solid rgba(245, 158, 11, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
    boxShadow: '0 0 16px rgba(245, 158, 11, 0.15)',
  },
  heroTitle: {
    fontSize: '18px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#F5F7FA',
    marginBottom: '6px',
  },
  heroSubTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: '6px',
  },
  heroDesc: {
    fontSize: '12.5px',
    color: 'var(--text-muted)',
    maxWidth: '380px',
    lineHeight: 1.5,
  },
  messageRow: {
    display: 'flex',
    width: '100%',
  },
  messageBubble: {
    maxWidth: '780px',
    borderRadius: 'var(--radius-md)',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  userBubble: {
    backgroundColor: '#161B23',
    border: '1px solid #2B3340',
    color: '#F5F7FA',
    borderBottomRightRadius: '2px',
  },
  aiBubble: {
    backgroundColor: '#0C0E13',
    border: '1px solid var(--border-default)',
    color: '#F5F7FA',
    borderBottomLeftRadius: '2px',
    width: '100%',
  },
  bubbleHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2px',
  },
  senderName: {
    fontSize: '9.5px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: 'var(--text-muted)',
  },
  msgTime: {
    fontSize: '9.5px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
  },
  msgText: {
    fontSize: '13px',
    lineHeight: 1.45,
  },
  thinkingContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#0F1217',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px',
    maxWidth: '420px',
  },
  thinkingSpinnerBox: {
    width: '28px',
    height: '28px',
    borderRadius: '5px',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'pulseGlow 1.5s infinite',
  },
  thinkingTextContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  thinkingTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#F5F7FA',
  },
  thinkingStep: {
    fontSize: '10.5px',
    fontFamily: 'var(--font-mono)',
    color: '#F59E0B',
  },
  inputContainer: {
    padding: '14px 24px 18px 24px',
    backgroundColor: '#0A0C0F',
    borderTop: '1px solid var(--border-default)',
    flexShrink: 0,
  },
  formRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#12151B',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '4px 8px',
  },
  inputToolBtn: {
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-xs)',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  queryInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#F5F7FA',
    fontSize: '13px',
    padding: '8px 4px',
  },
  sendBtn: {
    padding: '6px 14px',
    gap: '5px',
  },
};
