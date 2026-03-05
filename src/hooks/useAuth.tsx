import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import config from '../config';
import { queryStringify, windowOpen } from '../utils';
import { getUserInfo } from '../utils/request';

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

  useEffect(() => {
    const storedToken = localStorage.getItem('github_token');
    const storedUser = localStorage.getItem('github_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleAuthCallback = async (accessToken: string) => {
    setIsLoading(true);
    try {
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
    } catch (error) {
      console.error('Auth callback error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // open window，点击授权，重定向到 auth window，请求 proxy 获取token
  const login = () => {
    const githubOauthUrl = 'https://github.com/login/oauth/authorize';
    const query = {
      client_id: config.request.clientID,
      redirect_uri: window.location.href,
      scope: 'public_repo',
    };
    const loginLink = `${githubOauthUrl}?${queryStringify(query)}`;
    console.log('Opening OAuth window with client_id:', config.request.clientID);
    setIsLoading(true);
    windowOpen(loginLink)
      .then((token: unknown) => {
        console.log('Received access token, fetching user info...');
        handleAuthCallback(token as string);
      })
      .catch((error) => {
        console.error('Login error:', error);
        alert('Login failed: ' + (error || 'Unknown error'));
        setIsLoading(false);
      });
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
