"use client";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/** Reexecuta `recarregar` quando qualquer tabela observada muda (Supabase Realtime), com polling de segurança. */
export function useRealtime(tabelas: string[], recarregar: () => void, fallbackMs = 20000) {
  const ref = useRef(recarregar);
  ref.current = recarregar;
  useEffect(() => {
    const sb = createClient();
    let t: ReturnType<typeof setTimeout> | undefined;
    const agendar = () => { clearTimeout(t); t = setTimeout(() => ref.current(), 250); };
    const canal = sb.channel(`rt-${tabelas.join("-")}-${Math.random().toString(36).slice(2)}`);
    tabelas.forEach((tabela) => canal.on("postgres_changes", { event: "*", schema: "public", table: tabela }, agendar));
    canal.subscribe();
    ref.current();
    const iv = setInterval(() => ref.current(), fallbackMs);
    return () => { clearTimeout(t); clearInterval(iv); void sb.removeChannel(canal); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabelas.join(",")]);
}

export function tocarBip() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880; g.gain.value = 0.15;
    o.start(); o.stop(ctx.currentTime + 0.25);
  } catch { /* sem áudio */ }
}
