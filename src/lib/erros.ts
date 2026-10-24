const MAPA: Record<string, string> = {
  limite_excedido: "Muitas tentativas seguidas. Aguarde alguns minutos.",
  produto_esgotado: "Um dos itens acabou de esgotar. Revise a comanda.",
  produto_invalido: "Um dos itens não está mais disponível.",
  variacao_invalida: "Uma das opções escolhidas não está mais disponível.",
  mesa_invalida: "Mesa não encontrada.",
  whatsapp_invalido: "WhatsApp inválido. Use DDD + número, ex.: (11) 98888-7777.",
  nome_invalido: "Informe seu nome.",
  pedido_vazio: "Sua comanda está vazia.",
  pagamento_diferente_do_total: "A soma dos pagamentos precisa ser igual ao total.",
  valores_invalidos: "Desconto ou taxa inválidos.",
};
export function mensagemErro(e: { message?: string } | null | undefined): string {
  const msg = e?.message ?? "";
  for (const k of Object.keys(MAPA)) if (msg.includes(k)) return MAPA[k];
  return "Algo deu errado. Tente novamente.";
}
