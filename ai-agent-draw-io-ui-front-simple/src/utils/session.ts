import { CookieStorage } from './cookie';
import { AgentApiService } from '../api/agent';

/**
 * Session 管理工具类
 */
export class SessionManager {
  private static refreshPromise: Promise<string> | null = null;

  /**
   * 验证当前 Session 是否有效
   */
  static async validateSession(): Promise<boolean> {
    const sessionId = CookieStorage.getSessionId();
    const agentId = CookieStorage.getAgentId();
    const userId = CookieStorage.getUserId();

    if (!sessionId || !agentId || !userId) {
      return false;
    }

    try {
      const isValid = await AgentApiService.validateSession(agentId, userId, sessionId);
      return isValid;
    } catch (error) {
      console.error('验证 Session 失败:', error);
      return false;
    }
  }

  /**
   * 刷新 Session（重新创建）
   */
  static async refreshSession(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefreshSession();

    try {
      const sessionId = await this.refreshPromise;
      return sessionId;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * 执行刷新 Session 的内部方法
   */
  private static async doRefreshSession(): Promise<string> {
    const agentId = CookieStorage.getAgentId();
    const userId = CookieStorage.getUserId();

    if (!agentId || !userId) {
      throw new Error('缺少 agentId 或 userId');
    }

    const sessionId = await AgentApiService.createSession(agentId, userId);
    CookieStorage.setSessionId(sessionId);
    return sessionId;
  }

  /**
   * 确保 Session 有效，如果无效则刷新
   */
  static async ensureValidSession(): Promise<string> {
    const isValid = await this.validateSession();

    if (isValid) {
      return CookieStorage.getSessionId()!;
    }

    return this.refreshSession();
  }

  /**
   * 清除 Session
   */
  static clearSession(): void {
    CookieStorage.clearSession();
  }
}