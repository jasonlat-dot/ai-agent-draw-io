import {
  ApiResponse,
  ResponseCode,
  SessionDataRequest,
  CreateSessionRequest,
  CreateSessionResponse,
  ChatRequest,
  ChatResponse,
  AgentConfigResponse,
} from '../types/api';
import {
  API_BASE_URL,
  API_ENDPOINTS,
  REQUEST_TIMEOUT,
  buildApiUrl,
} from '../config/api-config';
import { CookieStorage } from '../utils/cookie';

/**
 * Agent API 服务类
 */
export class AgentApiService {
  /**
   * 通用请求方法
   */
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = buildApiUrl(endpoint);

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      credentials: 'include',
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result as T;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 查询智能体配置列表
   */
  static async queryAgentList(): Promise<AgentConfigResponse[]> {
    const response = await this.request<ApiResponse<AgentConfigResponse[]>>(
      API_ENDPOINTS.QUERY_AGENT_LIST,
      { method: 'GET' }
    );

    if (response.code !== ResponseCode.SUCCESS) {
      throw new Error(response.info || '查询智能体列表失败');
    }

    return response.data || [];
  }

  /**
   * 创建会话
   */
  static async createSession(agentId: string, userId: string): Promise<string> {
    const request: CreateSessionRequest = {
      agentId,
      userId,
    };

    const response = await this.request<ApiResponse<CreateSessionResponse>>(
      API_ENDPOINTS.CREATE_SESSION,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );

    if (response.code !== ResponseCode.SUCCESS) {
      throw new Error(response.info || '创建会话失败');
    }

    if (!response.data?.sessionId) {
      throw new Error('会话 ID 不存���');
    }

    return response.data.sessionId;
  }

  /**
   * 验证会话 ID
   */
  static async validateSession(
    agentId: string,
    userId: string,
    sessionId: string
  ): Promise<boolean> {
    const request: SessionDataRequest = {
      agentId,
      userId,
      sessionId,
    };

    const response = await this.request<ApiResponse<boolean>>(
      API_ENDPOINTS.VALIDATE_SESSION,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );

    if (response.code === ResponseCode.SESSION_NOT_EXIST) {
      return false;
    }

    if (response.code !== ResponseCode.SUCCESS) {
      throw new Error(response.info || '验证会话失败');
    }

    return response.data ?? false;
  }

  /**
   * 非流式对话
   */
  static async chat(
    agentId: string,
    userId: string,
    sessionId: string,
    message: string
  ): Promise<string> {
    const request: ChatRequest = {
      agentId,
      userId,
      sessionId,
      message,
    };

    const response = await this.request<ApiResponse<ChatResponse>>(
      API_ENDPOINTS.CHAT,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );

    if (response.code === ResponseCode.SESSION_NOT_EXIST) {
      throw new Error('SESSION_EXPIRED');
    }

    if (response.code !== ResponseCode.SUCCESS) {
      throw new Error(response.info || '对话请求失败');
    }

    return response.data?.content ?? '';
  }

  /**
   * 流式对话（SSE）
   * @param agentId 智能体 ID
   * @param userId 用户 ID
   * @param sessionId 会话 ID
   * @param message 用户消息
   * @param onMessage 消息回调（实时返回每个数据块）
   * @param onDone 完成回调
   * @param onError 错误回调
   * @returns void
   */
  static chatStream(
    agentId: string,
    userId: string,
    sessionId: string,
    message: string,
    onMessage: (content: string) => void,
    onDone?: () => void,
    onError?: (error: Error) => void
  ): { abort: () => void } {
    const url = `${API_BASE_URL}${API_ENDPOINTS.CHAT_STREAM}`;
    let aborted = false;

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        agentId,
        userId,
        sessionId,
        message,
      } as ChatRequest),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('无法读取响应流');
        }

        const decoder = new TextDecoder();

        const readStream = () => {
          reader.read().then(({ done, value }) => {
            if (aborted) {
              reader.cancel();
              return;
            }
            if (done) {
              onDone?.();
              return;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              const trimmedLine = line.trim();

              // 跳过空行
              if (!trimmedLine) {
                continue;
              }

              if (trimmedLine.startsWith('data: ')) {
                const content = trimmedLine.substring(6).trim();

                // 跳过结束标识
                if (content === '[DONE]' || content.startsWith('[DONE]')) {
                  onDone?.();
                  return;
                }
                // 直接发送内容
                onMessage(JSON.parse(content));
              } else {
                onMessage(trimmedLine)
              }
            }
            readStream();
          });
        };
        readStream();
      })
      .catch((error) => {
        if (!aborted) {
          onError?.(error);
        }
      });

    return {
      abort: () => {
        aborted = true;
      },
    };
  }

  /**
   * 获取当前上下文的请求参数
   */
  static getContextParams(): { agentId: string; userId: string; sessionId: string } {
    return {
      agentId: CookieStorage.getAgentId() || '',
      userId: CookieStorage.getUserId() || '',
      sessionId: CookieStorage.getSessionId() || '',
    };
  }
}
