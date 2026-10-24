"use client";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

const FRASES = ["Peça direto da sua mesa,", "sem fila."];

function useDigitar(ativo: boolean) {
  const [l, setL] = useState(["", ""]);
  useEffect(() => {
    if (!ativo) return;
    let i = 0, j = 0, t: ReturnType<typeof setTimeout>;
    const passo = () => {
      j++;
      setL((a) => a.map((x, k) => (k === i ? FRASES[i].slice(0, j) : x)));
      if (j >= FRASES[i].length) { i++; j = 0; if (i >= FRASES.length) return; t = setTimeout(passo, 280); return; }
      t = setTimeout(passo, 38);
    };
    t = setTimeout(passo, 150);
    return () => clearTimeout(t);
  }, [ativo]);
  return l;
}

export function Hero({ nome, iniciar, onVer }: { nome: string; iniciar: boolean; onVer: () => void }) {
  const [l1, l2] = useDigitar(iniciar);
  const feats = [
    ["Escolha no celular", 0.55], ["Acompanhe o preparo", 0.65], ["Pague no caixa", 0.75],
  ] as const;
  return (
    <div className="hero-track" id="hero">
      <div className="hero-sticky">
        <div className="hero-nome">
          <h1 className="grad-text">{nome}</h1>
        </div>
        <div className="hero-narrativa">
          <p className="mb-5 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent-light)]">
            <span className="pulso" aria-hidden /> Cardápio aberto
          </p>
          <h2 aria-label={FRASES.join(" ")}>
            <span className="block" aria-hidden>{l1}{l1.length < FRASES[0].length && <span className="cursor" />}</span>
            <span className="grad-accent block" aria-hidden>{l2}{l1.length >= FRASES[0].length && <span className="cursor" />}</span>
          </h2>
          <ul className="mt-8 flex flex-col items-center gap-2.5">
            {feats.map(([t, th]) => (
              <li key={t} className="hero-feat cartao rounded-full px-5 py-2.5 text-sm text-stone-200" style={{ ["--t" as string]: th }}>{t}</li>
            ))}
          </ul>
          <div className="hero-dica mt-8">
            <button type="button" onClick={onVer}
              className="brilho inline-flex h-12 items-center gap-2 rounded-full bg-[var(--accent)] px-7 font-semibold text-white">
              Ver cardápio <ChevronDown size={20} className="seta" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
