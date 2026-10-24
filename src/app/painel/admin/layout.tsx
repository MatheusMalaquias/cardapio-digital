import Link from "next/link";

const ABAS = [
  ["produtos", "Produtos"], ["categorias", "Categorias"], ["promocoes", "Promoções"], ["complementos", "Combina com"],
  ["mesas", "Mesas e QR"], ["equipe", "Equipe"], ["clientes", "Clientes"], ["campanhas", "Campanhas"], ["configuracoes", "Configurações"],
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav aria-label="Administração" className="mb-4 flex gap-2 overflow-x-auto">
        {ABAS.map(([h, t]) => (
          <Link key={h} href={`/painel/admin/${h}`} className="flex min-h-11 shrink-0 items-center rounded-full bg-white px-4 text-sm font-medium shadow-sm">{t}</Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
