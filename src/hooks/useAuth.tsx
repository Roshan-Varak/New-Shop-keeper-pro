import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  login: (password: string) => Promise<boolean>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  loading: true,
  login: async () => false,
  signOut: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem("shop_authenticated");
    setIsAuthenticated(stored === "true");
    setLoading(false);
  }, []);

  const login = async (password: string): Promise<boolean> => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase
      .from("shop_settings")
      .select("value")
      .eq("key", "shop_password")
      .single();

    if (error || !data) return false;

    if (data.value === password) {
      sessionStorage.setItem("shop_authenticated", "true");
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const signOut = () => {
    sessionStorage.removeItem("shop_authenticated");
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
