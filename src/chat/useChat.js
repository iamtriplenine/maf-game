import { useCallback, useEffect, useRef, useState } from "react";
import { fetchMessages, postMessage, postVoice } from "../api/chat";
import { registerRefresh } from "../api/refresh";

const POLL_MS = 5000; // verifie les nouveaux messages toutes les 5 s
const KEEP = 200; // messages gardes en memoire (= maximum garde par le serveur)

// Messages du chat global. Actif seulement quand `enabled` est vrai.
// Le bouton "rafraichir" recharge aussi les messages (registerRefresh).
export function useChat(enabled) {
  const [messages, setMessages] = useState([]);
  const lastId = useRef(0);
  const epoch = useRef(null); // change quand l'administrateur supprime des messages
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
      let data = await fetchMessages(lastId.current);
      if (epoch.current !== null && data.epoch !== epoch.current) {
        // des messages ont ete supprimes : on efface l'ecran et on recharge tout
        lastId.current = 0;
        setMessages([]);
        data = await fetchMessages(0);
      }
      epoch.current = data.epoch;
      merge(data.messages);
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

  // `content` : un texte, ou un vocal { audio, ms }
  const send = useCallback(
    async (content) => {
      merge([await (typeof content === "string" ? postMessage(content) : postVoice(content))]);
    },
    [merge]
  );

  return { messages, send };
}
