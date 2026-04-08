import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DrawIoEmbed, DrawIoEmbedRef } from 'react-drawio';
import ChatPanel from '../components/ChatPanel';
import { CookieStorage } from '../utils/cookie';
import '../App.css';

const MainPage: React.FC = () => {
  const navigate = useNavigate();
  const [xml, setXml] = useState<string>('');
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const drawioRef = useRef<DrawIoEmbedRef>(null);

  useEffect(() => {
    // 从 Cookie 读取流式模式设置
    const streaming = CookieStorage.getStreaming();
    setIsStreaming(streaming);
  }, []);

  const handleToggleChat = useCallback(() => {
    setChatCollapsed((prev) => !prev);
  }, []);

  const handleSave = useCallback((data: unknown) => {
    const eventData = data as { data?: string };
    if (eventData?.data) {
      setXml(eventData.data);
    }
  }, []);

  const handleLogout = useCallback(() => {
    CookieStorage.clearAll();
    navigate('/login', { replace: true });
  }, [navigate]);

  const handleStreamingChange = useCallback((value: boolean) => {
    setIsStreaming(value);
    CookieStorage.setStreaming(value);
  }, []);

  const handleLoadXml = useCallback((xmlContent: string) => {
    if (drawioRef.current && xmlContent) {
      drawioRef.current.load({ xml: xmlContent });
    }
  }, []);

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.appTitle}>AI Agent Draw.io</span>
          <span style={styles.agentName}>
            {CookieStorage.getAgentName() || '智能体'}
          </span>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.streamingToggle}>
            <div style={styles.toggleWrapper}>
              <span style={{
                ...styles.toggleLabel,
                color: isStreaming ? '#a5b4fc' : 'rgba(255,255,255,0.6)',
              }}>
                {isStreaming ? '流式' : '标准'}
              </span>
              <label style={styles.switch}>
                <input
                  type="checkbox"
                  checked={isStreaming}
                  onChange={(e) => handleStreamingChange(e.target.checked)}
                />
                <span style={{
                  ...styles.slider,
                  backgroundColor: isStreaming ? '#6366f1' : '#4b5563',
                }}>
                  <span style={{
                    ...styles.sliderHandle,
                    transform: isStreaming ? 'translateX(22px)' : 'translateX(2px)',
                  }} />
                </span>
              </label>
              <div style={styles.modeIndicator}>
                <span style={{
                  ...styles.modeDot,
                  backgroundColor: isStreaming ? '#10b981' : '#6b7280',
                  boxShadow: isStreaming ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none',
                }} />
              </div>
            </div>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            退出登录
          </button>
        </div>
      </header>
      <main style={styles.main}>
        <div style={styles.editorContainer}>
          <DrawIoEmbed
            ref={drawioRef}
            urlParameters={{
              ui: 'kennedy',
              spin: true,
            }}
            onSave={handleSave}
            autosave={true}
          />
        </div>
        <div
          style={{
            ...styles.chatContainer,
            width: chatCollapsed ? '60px' : '380px',
          }}
        >
          <ChatPanel
            isCollapsed={chatCollapsed}
            onToggle={handleToggleChat}
            isStreaming={isStreaming}
            onLoadXml={handleLoadXml}
          />
        </div>
      </main>
      {xml && (
        <div style={styles.xmlPreview}>
          <div style={styles.xmlHeader}>
            <span style={styles.xmlTitle}>导出的 XML</span>
            <button onClick={() => setXml('')} style={styles.closeBtn}>
              ×
            </button>
          </div>
          <pre style={styles.xmlContent}>{xml}</pre>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  app: {
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f8fafc',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: '#1e1b4b',
    color: '#fff',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  appTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
  },
  agentName: {
    fontSize: '14px',
    opacity: 0.8,
    padding: '4px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '20px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  streamingToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  toggleLabel: {
    fontSize: '13px',
    fontWeight: '500',
    transition: 'color 0.3s',
    minWidth: '36px',
    textAlign: 'center',
  },
  toggleWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
  },
  modeIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    transition: 'all 0.3s',
  },
  switch: {
    position: 'relative' as const,
    display: 'inline-block',
    width: '48px',
    height: '26px',
  },
  slider: {
    position: 'absolute' as const,
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    transition: '0.3s',
    borderRadius: '26px',
  },
  sliderHandle: {
    position: 'absolute' as const,
    content: '""',
    height: '22px',
    width: '22px',
    left: '2px',
    bottom: '2px',
    backgroundColor: 'white',
    transition: 'transform 0.3s',
    borderRadius: '50%',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  logoutBtn: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  main: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  editorContainer: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#fff',
  },
  chatContainer: {
    flexShrink: 0,
    transition: 'width 0.3s ease',
    overflow: 'hidden',
  },
  xmlPreview: {
    position: 'fixed' as const,
    bottom: '20px',
    right: '20px',
    width: '500px',
    maxHeight: '400px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
    zIndex: 1000,
  },
  xmlHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#1e1b4b',
    color: '#fff',
  },
  xmlTitle: {
    fontSize: '14px',
    fontWeight: '600',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '0 8px',
    lineHeight: 1,
  },
  xmlContent: {
    margin: 0,
    padding: '16px',
    overflow: 'auto' as const,
    maxHeight: '340px',
    fontSize: '12px',
    backgroundColor: '#f8fafc',
    fontFamily: 'Monaco, Consolas, monospace',
  },
};

export default MainPage;