export type Variacao = { id: string; nome: string; preco_delta: number };
export type Adicional = { id: string; nome: string; preco: number };
export type Produto = {
  id: string; nome: string; descricao: string | null; preco: number; preco_atual: number;
  foto_url: string | null; tamanho_descricao: string | null; alergenicos: string[]; esgotado: boolean;
  variacoes: Variacao[]; adicionais: Adicional[]; complementos: string[];
  ingredientes: string[]; preparo: string[]; opcoes: Opcao[];
};
export type Opcao = { nome: string; escolhas: string[] };
export type Cardapio = {
  estabelecimento: {
    id: string; slug: string; nome: string; logo_url: string | null; cor_destaque: string;
    texto_beneficio: string | null; fidelidade_meta: number; fidelidade_premio: string | null;
    politica_privacidade_url: string | null;
  };
  mesa: { id: string; numero: number; codigo: string };
  mais_pedido_hoje: string | null;
  categorias: { id: string; nome: string; produtos: Produto[] }[];
};
export type ItemCarrinho = {
  key: string; produto_id: string; nome: string; qtd: number; unit: number;
  variacao: Variacao | null; adicionais: Adicional[]; observacao: string;
  especificacoes: Record<string, string>;
};
export type ItemPedido = {
  nome: string; qtd: number; preco_unitario: number;
  variacao: { nome: string } | null; adicionais: { nome: string }[]; observacao: string | null;
  especificacoes?: Record<string, string> | null;
};
export type StatusPedido = "pendente" | "recusado" | "confirmado" | "em_preparo" | "pronto" | "entregue";
export type PedidoMesa = {
  id: string; status: StatusPedido; motivo_recusa: string | null; criado_em: string;
  meu: boolean; cliente_nome: string | null; itens: ItemPedido[];
};
export type ComandaMesa = {
  comanda: { id: string; status: string } | null; pedidos: PedidoMesa[]; total: number;
  chamados: { tipo: "garcom" | "conta"; criado_em: string; a_caminho: boolean }[];
};
export type Perfil = {
  nome: string; whatsapp: string; aniversario: string | null; selos: number; consentimento: boolean;
};
