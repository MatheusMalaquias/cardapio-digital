type Item = {
  nome: string; qtd: number; variacao?: { nome: string } | null;
  adicionais?: { nome: string }[] | null; observacao?: string | null;
  especificacoes?: Record<string, string> | null;
};

export function ItensResumo({ itens, claro = false }: { itens: Item[]; claro?: boolean }) {
  return (
    <ul className="space-y-1 text-sm">
      {itens.map((i, k) => (
        <li key={k}>
          <span className="font-semibold">{i.qtd}x {i.nome}</span>
          {i.variacao && <span className={claro ? "text-muted" : "text-stone-400"}> ({i.variacao.nome})</span>}
          {(i.adicionais?.length ?? 0) > 0 && (
            <span className={claro ? "text-muted" : "text-stone-400"}> + {i.adicionais!.map((a) => a.nome).join(", ")}</span>
          )}
          {i.especificacoes && Object.keys(i.especificacoes).length > 0 && (
            <p className={claro ? "text-muted" : "text-stone-300"}>{Object.entries(i.especificacoes).map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>
          )}
          {i.observacao && <p className={claro ? "font-medium text-amber-800" : "text-amber-400"}>Obs: {i.observacao}</p>}
        </li>
      ))}
    </ul>
  );
}
