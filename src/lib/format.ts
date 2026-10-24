const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const formatBRL = (v: number | string) => brl.format(Number(v));

export function fmtDuracao(seg: number | null | undefined) {
  if (seg == null) return "—";
  const m = Math.floor(seg / 60), s = Math.round(seg % 60);
  return m > 0 ? `${m} min ${s}s` : `${s}s`;
}
