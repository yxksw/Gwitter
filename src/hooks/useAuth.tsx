import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import config from '../config';
import { queryStringify } from '../utils';
import { getAccessToken, getUserInfo } from '../utils/request';

interface AuthContextType {
  isAuthenticated: boolean;
  user: { login: string; avatarUrl: string } | null;
  token: string | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ login: string; avatarUrl: string } | null>(
    null,
  );
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 打开弹窗进行 OAuth 授权
  const openAuthPopup = () => {
    const windowArea = {
      width: Math.max(Math.floor(window.outerWidth * 0.4), 400),
      height: Math.max(Math.floor(window.outerHeight * 0.4), 400),
      left: Math.floor(window.screenX + (window.outerWidth - Math.max(Math.floor(window.outerWidth * 0.4), 400)) / 2),
      top: Math.floor(window.screenY + (window.outerHeight - Math.max(Math.floor(window.outerHeight * 0.4), 400)) / 3),
    };

    const windowOpts = `toolbar=0,scrollbars=1,status=1,resizable=1,location=1,menuBar=0,width=${windowArea.width},height=${windowArea.height},left=${windowArea.left},top=${windowArea.top}`;

    return new Promise<string>((resolve, reject) => {
      // 创建一个内联 HTML 用于处理 OAuth 回调
      const githubOauthUrl = 'https://github.com/login/oauth/authorize';
      const query = {
        client_id: config.request.clientID,
        redirect_uri: `${window.location.origin}/callback.html`,
        scope: 'public_repo',
        state: JSON.stringify({
          client_id: config.request.clientID,
          client_secret: config.request.clientSecret,
        }),
      };
      const loginLink = `${githubOauthUrl}?${queryStringify(query)}`;

      const authWindow = window.open(loginLink, 'Gwitter OAuth Application', windowOpts);

      if (!authWindow) {
        reject(new Error('Failed to open authentication window'));
        return;
      }

      // 监听消息
      const handleMessage = (event: MessageEvent) => {
        // 确保消息来自同一个源
        if (event.origin !== window.location.origin) {
          return;
        }

        try {
          const { result, error } = JSON.parse(event.data);
          
          if (error) {
            reject(new Error(error));
          } else if (result) {
            resolve(result);
          }
        } catch (err) {
          // 忽略非 JSON 消息
        }
      };

      window.addEventListener('message', handleMessage);

      // 检查窗口是否关闭
      const checkWindowClosed = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkWindowClosed);
          window.removeEventListener('message', handleMessage);
          reject(new Error('Window closed by user'));
        }
      }, 500);

      // 清理函数
      const cleanup = () => {
        clearInterval(checkWindowClosed);
        window.removeEventListener('message', handleMessage);
      };

      // 如果成功，清理资源
      const originalResolve = resolve;
      const originalReject = reject;
      
      resolve = ((value: string) => {
        cleanup();
        originalResolve(value);
      }) as any;
      
      reject = ((reason: any) => {
        cleanup();
        originalReject(reason);
      }) as any;
    });
  };

  // 检查 URL 中是否有 code 参数（OAuth 回调）
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    const storedToken = localStorage.getItem('github_token');
    const storedUser = localStorage.getItem('github_user');

    // 如果有存储的 token，直接使用
    if (storedToken && storedUser && !code) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
    // 如果有 code 参数，处理 OAuth 回调
    else if (code) {
      handleAuthCallback(code);
    }
    setIsLoading(false);
  }, []);

  const handleAuthCallback = async (code: string) => {
    console.log('OAuth callback received, code:', code);
    setIsLoading(true);
    try {
      // 使用 code 换取 access_token
      const tokenResponse = await getAccessToken(code);
      console.log('Access token response:', tokenResponse);

      // 检查响应格式
      const accessToken = typeof tokenResponse === 'string'
        ? new URLSearchParams(tokenResponse).get('access_token')
        : tokenResponse.access_token;

      if (!accessToken) {
        throw new Error('Failed to get access token from response');
      }

      // 使用 access_token 获取用户信息
      const response = await getUserInfo(accessToken);
      const user = {
        login: response.login,
        avatarUrl: response.avatar_url,
      };

      setToken(accessToken);
      setUser(user);
      setIsAuthenticated(true);

      localStorage.setItem('github_token', accessToken);
      localStorage.setItem('github_user', JSON.stringify(user));

      // 清除 URL 中的 code 参数
      const url = new URL(window.location.href);
      url.searchParams.delete('code');
      window.history.replaceState({}, '', url.toString());
    } catch (error) {
      console.error('Auth callback error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 打开 GitHub 授权弹窗
  const login = async () => {
    try {
      setIsLoading(true);
      // 使用弹窗方式进行授权
      const accessToken = await openAuthPopup();
      
      if (accessToken) {
        // 使用 access_token 获取用户信息
        const response = await getUserInfo(accessToken);
        const user = {
          login: response.login,
          avatarUrl: response.avatar_url,
        };

        setToken(accessToken);
        setUser(user);
        setIsAuthenticated(true);

        localStorage.setItem('github_token', accessToken);
        localStorage.setItem('github_user', JSON.stringify(user));
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);
    localStorage.removeItem('github_token');
    localStorage.removeItem('github_user');
  };

  const value = {
    isAuthenticated,
    user,
    token,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
