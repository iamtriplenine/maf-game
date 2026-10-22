import { useCallback, useEffect, useState } from "react";
import * as accounts from "../api/accounts";

export function useSession() {
  const [session, setSession] = useState(() => accounts.currentSession());

  // Au chargement : verifie la session aupres du serveur et met le solde a jour.
  useEffect(() => {
    if (!accounts.currentSession()) return undefined;
    let alive = true;
    accounts.refreshSession().then((user) => {
      if (alive) setSession(user);
    });
    return () => {
      alive = false;
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
