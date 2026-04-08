/**
 * API 统一响应包装类型
 */
export interface ApiResponse<T> {
  code: string;
  info: string;
  data: T;
}

/**
 * 状态码常量
 */
export const ResponseCode = {
  SUCCESS: 'SUCCESS_0000',
  ERROR: 'ERROR_0001',
  SESSION_NOT_EXIST: 'SESSION_NOT_EXIST',
} as const;

/**
 * 会话数据请求
 */
export interface SessionDataRequest {
  agentId: string;
  userId: string;
  sessionId: string;
}

/**
 * 创建会话请求
 */
export interface CreateSessionRequest {
  agentId: string;
  userId: string;
}

/**
 * 创建会话响应
 */
export interface CreateSessionResponse {
  sessionId: string;
}

/**
 * 聊天请求
 */
export interface ChatRequest {
  agentId: string;
  userId: string;
  sessionId: string;
  message: string;
}

/**
 * 聊天响应
 */
export interface ChatResponse {
  content: string;
}

/**
 * 智能体配置
 */
export interface AgentConfigResponse {
  agentId: string;
  agentName: string;
  agentDesc: string;
}

/**
 * 前端应用状态
 */
export interface AppState {
  userId: string;
  agentId: string;
  agentName: string;
  sessionId: string;
  isStreaming: boolean;
}

/**
 * 消息类型
 */
export interface Message {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
  xml?: string;
}

/**
 * Cookie 存储的键名
 */
export const CookieKeys = {
  USER_ID: 'ai_drawio_user_id',
  AGENT_ID: 'ai_drawio_agent_id',
  AGENT_NAME: 'ai_drawio_agent_name',
  SESSION_ID: 'ai_drawio_session_id',
  IS_STREAMING: 'ai_drawio_is_streaming',
} as const;
