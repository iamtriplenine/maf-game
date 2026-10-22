import { useCallback, useEffect, useRef, useState } from "react";
import { fetchMessages, postMessage } from "../api/chat";
import { registerRefresh } from "../api/refresh";

const POLL_MS = 5000; // verifie les nouveaux messages toutes les 5 s
const KEEP = 40; // messages gardes en memoire

// Messages du chat global. Actif seulement quand `enabled` est vrai.
// Le bouton "rafraichir" recharge aussi les messages (registerRefresh).
export function useChat(enabled) {
  const [messages, setMessages] = useState([]);
  const lastId = useRef(0);
  const loading = useRef(false);

  const merge = useCallback((incoming) => {
    if (!incoming.length) return;
    lastId.current = Math.max(lastId.current, ...incoming.map((m) => m.id));
    setMessages((previous) => {
      const known = new Set(previous.map((m) => m.id));
      return [...previous, ...incoming.filter((m) => !known.has(m.id))]
        .sort((a, b) => a.id - b.id)
        .slice(-KEEP);
    });
  }, []);

  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      merge(await fetchMessages(lastId.current));
    } finally {
      loading.current = false;
    }
  }, [merge]);

  useEffect(() => {
    if (!enabled) return undefined;
    load().catch(() => {});
    const timer = setInterval(() => {
      if (!document.hidden) load().catch(() => {});
    }, POLL_MS);
    const unregister = registerRefresh(load);
    return () => {
      clearInterval(timer);
      unregister();
    };
  }, [enabled, load]);

  const send = useCallback(
    async (text) => {
      merge([await postMessage(text)]);
    },
    [merge]
  );

  return { messages, send };
}
