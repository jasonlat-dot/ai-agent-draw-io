import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types/api';
import { AgentApiService } from '../api/agent';
import { SessionManager } from '../utils/session';
import { extractDiagramXml, autoExpandCanvas } from '../utils/diagramXml';

interface ChatPanelProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isStreaming: boolean;
  onLoadXml: (xml: string) => void;
  sendCanvasInfo: boolean;
  getGlobalCanvasXml: () => string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  isCollapsed,
  onToggle,
  isStreaming,
  onLoadXml,
  sendCanvasInfo,
  getGlobalCanvasXml,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'agent',
      content: '你好！我是 AI Agent，我可以帮助你创建和编辑 Draw.io 图表。告诉我你想要什么样的图表，我会帮你生成！',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<{ abort: () => void } | null>(null);
  const streamAccumRef = useRef('');

  useEffect(() => {
    if (!isCollapsed) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isCollapsed]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const createNewMessage = (content: string, type: 'user' | 'agent'): Message => ({
    id: Date.now().toString(),
    type,
    content,
    timestamp: new Date(),
  });

  const handleSessionExpired = async (message: string, messageId: string) => {
    const newSessionId = await SessionManager.refreshSession();
    const { agentId, userId } = AgentApiService.getContextParams();

    const content = await AgentApiService.chat(
      agentId,
      userId,
      newSessionId,
      message
    );

    const xml = extractDiagramXml(content);
    if (xml) {
      onLoadXml(xml);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, content: '已根据您的需求生成架构图，请在左侧画板查看。您可以继续提出修改建议', xml }
            : msg
        )

      );
    } else {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, content, xml: undefined }
            : msg
        )
      );
    }
  };

  const handleNormalChat = async (message: string, messageId: string) => {
    try {
      const sessionId = await SessionManager.ensureValidSession();
      const { agentId, userId } = AgentApiService.getContextParams();

      const content = await AgentApiService.chat(
        agentId,
        userId,
        sessionId,
        message
      );

      const xml = extractDiagramXml(content);
      if (xml) {
        onLoadXml(xml);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, content: '已根据您的需求生成架构图，请在左侧画板查看。您可以继续提出修改建议', xml }
              : msg
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, content, xml: undefined }
              : msg
          )
        );
      }
    } catch (error: unknown) {
      const err = error as Error;
      if (err.message === 'SESSION_EXPIRED') {
        await handleSessionExpired(message, messageId);
      } else {
        throw error;
      }
    }
  };

  const handleStreamingChat = (message: string, messageId: string) => {
    return new Promise<void>((resolve, reject) => {
      SessionManager.ensureValidSession()
        .then(async (sid) => {
          const { agentId, userId } = AgentApiService.getContextParams();
          streamAccumRef.current = '';

          abortControllerRef.current = AgentApiService.chatStream(
            agentId,
            userId,
            sid,
            message,
            (chunk) => {
              const content = typeof chunk === 'string' ? chunk : String(chunk);
              streamAccumRef.current += content;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === messageId
                    ? { ...msg, content: (msg.content || '') + content }
                    : msg
                )
              );
            },
            () => {
              const rawContent = streamAccumRef.current;
              const xml = extractDiagramXml(rawContent);

              if (xml) {
                const expanded = autoExpandCanvas(xml);
                onLoadXml(expanded);
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === messageId
                      ? { ...msg, content: '已根据您的需求生成架构图，请在左侧画板查看。您可以继续提出修改建议', xml: expanded }
                      : msg
                  )
                );
              } else {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === messageId
                      ? { ...msg, content: rawContent, xml: undefined }
                      : msg
                  )
                );
              }

              resolve();
            },
            (error) => {
              if (error.name === 'AbortError') {
                resolve();
                return;
              }
              if (error.message === 'SESSION_EXPIRED') {
                handleSessionExpired(message, messageId)
                  .then(resolve)
                  .catch(reject);
              } else {
                reject(error);
              }
            }
          );
        })
        .catch(reject);
    });
  };

  const handleChatError = (error: unknown, messageId: string) => {
    const err = error as Error;
    if (err.name === 'AbortError') return;
    console.error('聊天失败:', err);
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, content: `出错了: ${err.message || '未知错误'}` }
          : msg
      )
    );
  };

  const handleMessageSent = async (messageText: string) => {
    if (!messageText.trim() || isSending) return;

    let finalMessage = messageText;
    if (sendCanvasInfo) {
      const canvasXml = getGlobalCanvasXml();
      if (canvasXml) {
        finalMessage = `【当前画布 XML】\n\`\`\`xml\n${canvasXml}\n\`\`\`\n\n【用户消息】\n${messageText}`;
      }
    }

    const userMessage = createNewMessage(messageText, 'user');
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsSending(true);

    const agentMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: agentMessageId,
        type: 'agent',
        content: '',
        timestamp: new Date(),
      },
    ]);

    try {
      if (isStreaming) {
        await handleStreamingChat(finalMessage, agentMessageId);
      } else {
        await handleNormalChat(finalMessage, agentMessageId);
      }
    } catch (error) {
      handleChatError(error, agentMessageId);
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = () => {
    handleMessageSent(inputValue);
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsSending(false);
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.type === 'agent' && !lastMsg.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyXml = async (xml: string, msgId: string) => {
    try {
      await navigator.clipboard.writeText(xml);
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = xml;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const getDisplayContent = (msg: Message) => {
    return msg.content;
  };

  return (
    <div style={{ ...styles.container, width: isCollapsed ? '60px' : '100%' }}>
      <div style={styles.header}>
        {!isCollapsed && (
          <div style={styles.headerContent}>
            <div style={styles.avatar}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <div>
              <div style={styles.title}>AI 助手</div>
              <div style={styles.status}>
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: isStreaming ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                  color: isStreaming ? '#10b981' : '#9ca3af',
                }}>
                  {isStreaming ? (
                    <>
                      <span style={styles.streamingDot} />
                      流式模式
                    </>
                  ) : (
                    '标准模式'
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
        <button onClick={onToggle} style={styles.toggleBtn}>
          {isCollapsed ? '◀' : '▶'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div style={styles.messagesContainer}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  ...styles.messageWrapper,
                  justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {msg.type === 'agent' && (
                  <div style={styles.agentAvatar}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  </div>
                )}
                <div
                  style={{
                    ...styles.messageBubble,
                    background:
                      msg.type === 'user' ? colors.userBubble : colors.agentBubble,
                    border:
                      msg.type === 'agent' ? `1px solid ${colors.agentBorder}` : 'none',
                    color: msg.type === 'user' ? colors.textLight : colors.textPrimary,
                    boxShadow:
                      msg.type === 'user'
                        ? '0 4px 14px 0 rgba(99, 102, 241, 0.4)'
                        : colors.shadow,
                    borderRadius:
                      msg.type === 'user'
                        ? '18px 18px 4px 18px'
                        : '18px 18px 18px 4px',
                  }}
                >
                  <div style={styles.messageContent}>{getDisplayContent(msg)}</div>
                  {msg.type === 'agent' && msg.xml && (
                    <button
                      onClick={() => handleCopyXml(msg.xml!, msg.id)}
                      title="复制 XML"
                      style={{
                        ...styles.copyXmlBtn,
                        background: copiedId === msg.id ? '#10b981' : '#f3f4f6',
                        color: copiedId === msg.id ? '#fff' : '#6b7280',
                      }}
                    >
                      {copiedId === msg.id ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                        </svg>
                      )}
                      <span>{copiedId === msg.id ? '已复制' : '复制 XML'}</span>
                    </button>
                  )}
                  <div
                    style={{
                      ...styles.messageTime,
                      textAlign: msg.type === 'user' ? 'right' : 'left',
                      color:
                        msg.type === 'user' ? 'rgba(255,255,255,0.7)' : colors.textSecondary,
                    }}
                  >
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
                {msg.type === 'user' && (
                  <div style={styles.userAvatar}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
            {isSending && (
              <div style={styles.sendingContainer}>
                <div style={styles.typingIndicator}>
                  <div style={styles.typingDot}></div>
                  <div style={{ ...styles.typingDot, animationDelay: '0.2s' }}></div>
                  <div style={{ ...styles.typingDot, animationDelay: '0.4s' }}></div>
                </div>
                <button onClick={handleStopStreaming} style={styles.stopBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                  停止
                </button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={styles.inputContainer}>
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="描述你想要创建的图表..."
              style={styles.input}
              rows={1}
            />
            <button
              onClick={handleSend}
              style={{
                ...styles.sendBtn,
                opacity: !inputValue.trim() || isSending ? 0.5 : 1,
              }}
              disabled={!inputValue.trim() || isSending}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </>
      )}

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

const colors = {
  primary: '#6366f1',
  userBubble: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  agentBubble: '#ffffff',
  agentBorder: '#e5e7eb',
  background: '#f8fafc',
  headerBg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
  inputBg: '#ffffff',
  textPrimary: '#1f2937',
  textSecondary: '#6b7280',
  textLight: '#ffffff',
  shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: colors.background,
    transition: 'width 0.3s ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: colors.headerBg,
    color: '#fff',
    flexShrink: 0,
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
  },
  status: {
    fontSize: '12px',
    opacity: 0.8,
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '500',
    transition: 'all 0.3s',
  },
  streamingDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    animation: 'pulse 1.5s infinite',
  },
  toggleBtn: {
    background: 'rgba(255, 255, 255, 0.15)',
    border: 'none',
    color: '#fff',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '10px 14px',
    borderRadius: '8px',
    transition: 'all 0.2s',
    flexShrink: 0,
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    backgroundColor: colors.background,
  },
  messageWrapper: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
    width: '100%',
  },
  agentAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: colors.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    flexShrink: 0,
  },
  userAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: colors.userBubble,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    flexShrink: 0,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: '14px 18px',
    wordBreak: 'break-word',
    lineHeight: 1.5,
  },
  messageContent: {
    marginBottom: '4px',
    fontSize: '14px',
  },
  copyXmlBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '8px',
    padding: '4px 10px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'background 0.2s, color 0.2s',
  },
  messageTime: {
    fontSize: '11px',
    opacity: 0.8,
  },
  typingIndicator: {
    display: 'flex',
    gap: '4px',
    padding: '12px 16px',
    backgroundColor: colors.agentBubble,
    borderRadius: '18px',
    width: 'fit-content',
    border: `1px solid ${colors.agentBorder}`,
  },
  typingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: colors.primary,
    animation: 'bounce 1.4s infinite ease-in-out',
  },
  sendingContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  stopBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    borderRadius: '18px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  inputContainer: {
    display: 'flex',
    gap: '12px',
    padding: '16px 20px',
    backgroundColor: colors.inputBg,
    borderTop: `1px solid ${colors.agentBorder}`,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    padding: '14px 16px',
    borderRadius: '12px',
    border: `2px solid ${colors.agentBorder}`,
    resize: 'none',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s',
    lineHeight: 1.5,
  },
  sendBtn: {
    width: '48px',
    height: '48px',
    backgroundColor: colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    flexShrink: 0,
  },
};

export default ChatPanel;
