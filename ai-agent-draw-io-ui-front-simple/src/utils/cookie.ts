import Cookies from 'js-cookie';
import { CookieKeys } from '../types/api';

/**
 * Cookie 存储工具类
 */
export class CookieStorage {
  /**
   * 设置用户 ID
   */
  static setUserId(userId: string): void {
    Cookies.set(CookieKeys.USER_ID, userId);
  }

  /**
   * 获取用户 ID
   */
  static getUserId(): string | undefined {
    return Cookies.get(CookieKeys.USER_ID);
  }

  /**
   * 设置智能体 ID
   */
  static setAgentId(agentId: string): void {
    Cookies.set(CookieKeys.AGENT_ID, agentId);
  }

  /**
   * 获取智能体 ID
   */
  static getAgentId(): string | undefined {
    return Cookies.get(CookieKeys.AGENT_ID);
  }

  /**
   * 设置智能体名称
   */
  static setAgentName(agentName: string): void {
    Cookies.set(CookieKeys.AGENT_NAME, agentName);
  }

  /**
   * 获取智能体名称
   */
  static getAgentName(): string | undefined {
    return Cookies.get(CookieKeys.AGENT_NAME);
  }

  /**
   * 设置会话 ID
   */
  static setSessionId(sessionId: string): void {
    Cookies.set(CookieKeys.SESSION_ID, sessionId);
  }

  /**
   * 获取会话 ID
   */
  static getSessionId(): string | undefined {
    return Cookies.get(CookieKeys.SESSION_ID);
  }

  /**
   * 设置流式模式
   */
  static setStreaming(isStreaming: boolean): void {
    Cookies.set(CookieKeys.IS_STREAMING, String(isStreaming));
  }

  /**
   * 获取流式模式
   */
  static getStreaming(): boolean {
    const value = Cookies.get(CookieKeys.IS_STREAMING);
    return value === 'true';
  }

  /**
   * 清除所有会话相关数据
   */
  static clearSession(): void {
    Cookies.remove(CookieKeys.SESSION_ID);
  }

  /**
   * 清除所有数据
   */
  static clearAll(): void {
    Object.values(CookieKeys).forEach(key => {
      Cookies.remove(key);
    });
  }

  /**
   * 检查是否已登录（有 userId 和 agentId）
   */
  static isLoggedIn(): boolean {
    return !!(this.getUserId() && this.getAgentId() && this.getSessionId());
  }
}