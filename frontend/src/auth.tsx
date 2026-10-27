import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ApiClient } from "./api";
import type { Session } from "./types";

type Auth = {
  client: ApiClient;
  session: Session | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  accept: (session: Session) => void;
};
const Context = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new ApiClient());
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const accept = useCallback(
    (value: Session) => {
      client.csrf = value.csrf_token;
      setSession(value);
    },
    [client],
  );
  const refresh = useCallback(async () => {
    setError("");
    try {
      accept(await client.request<Session>("/auth/session/"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot open your workspace.");
    } finally {
      setLoading(false);
    }
  }, [client, accept]);
  useEffect(() => {
    void refresh();
    client.onExpired = () => {
      void refresh();
    };
    return () => {
      client.onExpired = undefined;
    };
  }, [client, refresh]);
  return (
    <Context.Provider value={{ client, session, loading, error, refresh, accept }}>
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("Auth provider missing");
  return value;
}
