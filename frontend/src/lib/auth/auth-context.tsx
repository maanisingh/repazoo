import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  full_name: string;
  token: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('repazoo_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('repazoo_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { n8nClient } = await import('../api/n8n-client');
    const response = await n8nClient.login({ email, password });

    if (response.success && response.token && response.user_id) {
      const userData: User = {
        id: response.user_id,
        email,
        full_name: email.split('@')[0], // Will be updated from profile
        token: response.token,
      };
      setUser(userData);
      localStorage.setItem('repazoo_user', JSON.stringify(userData));
    } else {
      throw new Error(response.message || 'Login failed');
    }
  };

  const register = async (email: string, password: string, fullName: string) => {
    const { n8nClient } = await import('../api/n8n-client');
    const response = await n8nClient.register({ email, password, full_name: fullName });

    if (response.success && response.user_id) {
      // Auto-login after registration
      await login(email, password);
    } else {
      throw new Error(response.message || 'Registration failed');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('repazoo_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
