import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgentApiService } from '../api/agent';
import { AgentConfigResponse } from '../types/api';
import { CookieStorage } from '../utils/cookie';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [agentList, setAgentList] = useState<AgentConfigResponse[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAgentList();
  }, []);

  const loadAgentList = async () => {
    try {
      const list = await AgentApiService.queryAgentList();
      setAgentList(list);
      if (list.length > 0) {
        setSelectedAgent(list[0].agentId);
      }
    } catch (err) {
      setError('加载智能体列表失败，请检查后端服务是否启动');
      console.error('加载智能体列表失败:', err);
    }
  };

  const handleLogin = async () => {
    if (!userId.trim()) {
      setError('请输入用户 ID');
      return;
    }
    if (!selectedAgent) {
      setError('请选择智能体');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 创建会话
      const sessionId = await AgentApiService.createSession(selectedAgent, userId);

      // 存储到 Cookie
      CookieStorage.setUserId(userId);
      CookieStorage.setAgentId(selectedAgent);
      CookieStorage.setAgentName(
        agentList.find((a) => a.agentId === selectedAgent)?.agentName || ''
      );
      CookieStorage.setSessionId(sessionId);
      CookieStorage.setStreaming(false);

      // 跳转到主页面
      navigate('/main');
    } catch (err) {
      setError('登录失败，请重试');
      console.error('登录失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>AI Agent Draw.io</h1>
          <p style={styles.subtitle}>智能绘图助手</p>
        </div>

        <div style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>用户 ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="请输入用户 ID"
              style={styles.input}
              disabled={isLoading}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>选择智能体</label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              style={styles.select}
              disabled={isLoading || agentList.length === 0}
            >
              {agentList.length === 0 ? (
                <option value="">加载中...</option>
              ) : (
                agentList.map((agent) => (
                  <option key={agent.agentId} value={agent.agentId}>
                    {agent.agentName} - {agent.agentDesc}
                  </option>
                ))
              )}
            </select>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            onClick={handleLogin}
            disabled={isLoading || !userId.trim() || !selectedAgent}
            style={{
              ...styles.button,
              opacity: isLoading || !userId.trim() || !selectedAgent ? 0.6 : 1,
            }}
          >
            {isLoading ? '登录中...' : '开始使用'}
          </button>
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            使用 AI 智能体创建 Draw.io 图表
          </p>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '20px',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    padding: '14px 16px',
    borderRadius: '10px',
    border: '2px solid #e5e7eb',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  select: {
    padding: '14px 16px',
    borderRadius: '10px',
    border: '2px solid #e5e7eb',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
  button: {
    padding: '14px',
    backgroundColor: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: '8px',
  },
  error: {
    color: '#ef4444',
    fontSize: '14px',
    textAlign: 'center' as const,
    padding: '10px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center' as const,
  },
  footerText: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: 0,
  },
};

export default LoginPage;