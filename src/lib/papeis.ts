export type Papel = "garcom" | "cozinha" | "caixa" | "dono";

/** Quais papéis podem acessar cada área do painel. */
export const ACESSO: { prefixo: string; papeis: Papel[] }[] = [
  { prefixo: "/painel/garcom", papeis: ["garcom", "dono"] },
  { prefixo: "/painel/cozinha", papeis: ["cozinha", "dono"] },
  { prefixo: "/painel/caixa", papeis: ["caixa", "dono"] },
  { prefixo: "/painel/metricas", papeis: ["dono"] },
  { prefixo: "/painel/admin", papeis: ["dono"] },
];

export const HOME_POR_PAPEL: Record<Papel, string> = {
  garcom: "/painel/garcom",
  cozinha: "/painel/cozinha",
  caixa: "/painel/caixa",
  dono: "/painel/admin",
};

export const NOME_PAPEL: Record<Papel, string> = {
  garcom: "Garçom",
  cozinha: "Cozinha",
  caixa: "Caixa",
  dono: "Dono / Gerente",
};
