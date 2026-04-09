import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DrawIoEmbed, DrawIoEmbedRef } from 'react-drawio';
import ChatPanel from '../components/ChatPanel';
import { CookieStorage } from '../utils/cookie';
import { expandCompressedDiagramInMxfile } from '../utils/diagramXml';
import '../App.css';

/** 全局字段：保存当前画布的明文 XML 数据（画布内容变化时自动更新） */
let globalCanvasXml = '';

/** 与 diagrams.net 菜单「文件 → 导出为 → XML」一致：明文 mxfile，非 xmlsvg 压缩块 */
function requestPlainXmlExport(drawioRef: React.RefObject<DrawIoEmbedRef | null>) {
  const api = drawioRef.current as unknown as
    | { exportDiagram: (opts: Record<string, unknown>) => void }
    | null;
  api?.exportDiagram({
    format: 'xml',
    compressed: false,
  });
}

const MainPage: React.FC = () => {
  const navigate = useNavigate();
  const [xml, setXml] = useState<string>('');
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showCopiedTip, setShowCopiedTip] = useState(false);
  const [sendCanvasInfo, setSendCanvasInfo] = useState(false);
  const drawioRef = useRef<DrawIoEmbedRef>(null);
  /** embed 协议里 autosave 事件携带的明文 diagram XML（与编辑器内部一致） */
  const latestPlainXmlRef = useRef<string>('');

  useEffect(() => {
    // 从 Cookie 读取流式模式设置
    const streaming = CookieStorage.getStreaming();
    setIsStreaming(streaming);
  }, []);

  const handleToggleChat = useCallback(() => {
    setChatCollapsed((prev) => !prev);
  }, []);

  const handleAutoSave = useCallback((data: unknown) => {
    const eventData = data as { xml?: string };
    if (eventData?.xml) {
      latestPlainXmlRef.current = eventData.xml;
      globalCanvasXml = eventData.xml;
      console.log('[globalCanvasXml]', globalCanvasXml);
    }
  }, []);

  const handleExport = useCallback((data: unknown) => {
    const eventData = data as { xml?: string; format?: string };
    let raw = eventData?.xml?.trim();
    if (raw) {
      if (raw.includes('<mxfile') && !raw.includes('<mxGraphModel')) {
        raw = expandCompressedDiagramInMxfile(raw);
      }
      if (raw.includes('<mxGraphModel')) {
        setXml(raw);
        return;
      }
    }
    const fallback = latestPlainXmlRef.current;
    if (fallback) {
      setXml(fallback);
    }
  }, []);

  const handleExportXml = useCallback(() => {
    requestPlainXmlExport(drawioRef);
  }, []);

  const handleCopyXml = useCallback(async () => {
    if (!xml) return;
    try {
      await navigator.clipboard.writeText(xml);
      setShowCopiedTip(true);
      setTimeout(() => setShowCopiedTip(false), 1500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = xml;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setShowCopiedTip(true);
      setTimeout(() => setShowCopiedTip(false), 1500);
    }
  }, [xml]);

  const handleDownloadXml = useCallback(() => {
    if (!xml) return;
    const blob = new Blob([xml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagram-${Date.now()}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [xml]);

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
      globalCanvasXml = xmlContent;
      console.log(xmlContent)
      console.log(globalCanvasXml)
    }
  }, []);

  /** 更新全局字段（当通过其他方式更新画布内容时调用） */
  const updateGlobalCanvasXml = useCallback((xmlContent: string) => {
    globalCanvasXml = xmlContent;
    console.log('[globalCanvasXml]', globalCanvasXml);
  }, []);

  /** 获取全局画布 XML 的函数（供 ChatPanel 使用） */
  const getGlobalCanvasXml = useCallback(() => globalCanvasXml, []);

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
          <div style={styles.streamingToggle}>
            <div style={styles.toggleWrapper}>
              <span style={{
                ...styles.toggleLabel,
                color: sendCanvasInfo ? '#a5b4fc' : 'rgba(255,255,255,0.6)',
              }}>
                画布信息
              </span>
              <label style={styles.switch}>
                <input
                  type="checkbox"
                  checked={sendCanvasInfo}
                  onChange={(e) => setSendCanvasInfo(e.target.checked)}
                />
                <span style={{
                  ...styles.slider,
                  backgroundColor: sendCanvasInfo ? '#6366f1' : '#4b5563',
                }}>
                  <span style={{
                    ...styles.sliderHandle,
                    transform: sendCanvasInfo ? 'translateX(22px)' : 'translateX(2px)',
                  }} />
                </span>
              </label>
              <div style={styles.modeIndicator}>
                <span style={{
                  ...styles.modeDot,
                  backgroundColor: sendCanvasInfo ? '#10b981' : '#6b7280',
                  boxShadow: sendCanvasInfo ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none',
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
          <div style={styles.editorToolbar}>
            <button onClick={handleExportXml} style={styles.exportBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
              </svg>
              导出 XML
            </button>
          </div>
          <DrawIoEmbed
            ref={drawioRef}
            urlParameters={{
              ui: 'kennedy',
              spin: true,
            }}
            onAutoSave={handleAutoSave}
            onExport={handleExport}
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
            sendCanvasInfo={sendCanvasInfo}
            getGlobalCanvasXml={getGlobalCanvasXml}
          />
        </div>
      </main>
      {xml && (
        <div style={styles.xmlPreview}>
          <div style={styles.xmlHeader}>
            <span style={styles.xmlTitle}>导出的 XML</span>
            <div style={styles.xmlActions}>
              <button onClick={handleCopyXml} style={styles.xmlActionBtn}>
                {showCopiedTip ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    已复制
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                    </svg>
                    复制
                  </>
                )}
              </button>
              <button onClick={handleDownloadXml} style={styles.xmlActionBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
                下载
              </button>
              <button onClick={() => setXml('')} style={styles.closeBtn}>
                ×
              </button>
            </div>
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
    display: 'flex',
    flexDirection: 'column',
  },
  editorToolbar: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '8px 12px',
    backgroundColor: '#f3f4f6',
    borderBottom: '1px solid #e5e7eb',
    flexShrink: 0,
  },
  exportBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    backgroundColor: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
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
    padding: '10px 16px',
    backgroundColor: '#1e1b4b',
    color: '#fff',
  },
  xmlActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  xmlActionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'background 0.2s',
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