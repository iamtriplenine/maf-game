import { useCallback, useEffect, useState } from "react";
import * as accounts from "../api/accounts";

export function useSession() {
  const [session, setSession] = useState(() => accounts.currentSession());

  useEffect(() => {
    const sync = () => setSession(accounts.currentSession());
    window.addEventListener('maf:session', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('maf:session', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const login = useCallback(async (pseudo, code) => {
    setSession(await accounts.login(pseudo, code));
  }, []);

  const register = useCallback(async (pseudo, code) => {
    setSession(await accounts.register(pseudo, code));
  }, []);

  const logout = useCallback(() => {
    accounts.logout();
    setSession(null);
  }, []);

  const updateUser = useCallback((user) => {
    accounts.storeWalletUser(user);
    setSession(previous => previous?.id === user.id ? user : previous);
  }, []);
  return { session, login, register, logout, updateUser };
}
