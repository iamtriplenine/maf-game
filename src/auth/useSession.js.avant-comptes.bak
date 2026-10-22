import { useCallback, useState } from "react";
import * as accounts from "../api/accounts";

export function useSession() {
  const [session, setSession] = useState(() => accounts.currentSession());

  const login = useCallback(async (code) => {
    setSession(await accounts.login(code));
  }, []);

  const register = useCallback(async (code) => {
    setSession(await accounts.register(code));
  }, []);

  const logout = useCallback(() => {
    accounts.logout();
    setSession(null);
  }, []);

  return { session, login, register, logout };
}