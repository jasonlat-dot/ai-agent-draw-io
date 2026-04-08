/**
 * API 配置
 */

// 后端服务基础地址
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8888/api/v1';

// API 端点配置
export const API_ENDPOINTS = {
  // 验证会话 ID
  VALIDATE_SESSION: '/agent/validateSessionId',
  // 查询智能体配置列表
  QUERY_AGENT_LIST: '/agent/query_ai_agent_config_list',
  // 创建会话
  CREATE_SESSION: '/agent/create_session',
  // 非流式对话
  CHAT: '/agent/chat',
  // 流式对话
  CHAT_STREAM: '/agent/chat_stream',
} as const;

// 请求超时时间（毫秒）
export const REQUEST_TIMEOUT = 60000;

// SSE 连接超时时间（毫秒）
export const SSE_TIMEOUT = 300000;

// 构建完整 API URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};
