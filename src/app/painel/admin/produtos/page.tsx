import { createClient } from "@/lib/supabase/server";
import { adicionarAdicional, adicionarVariacao, salvarProduto } from "../actions";
import { Excluir } from "@/components/admin/Excluir";
import { btn, Campo, inp } from "@/components/admin/campos";
import { formatBRL } from "@/lib/format";

const ALERG = [["sem_gluten", "Sem glúten"], ["sem_lactose", "Sem lactose"], ["vegano", "Vegano"]];

/* eslint-disable @typescript-eslint/no-explicit-any */
function FormProduto({ p, cats }: { p?: any; cats: any[] }) {
  return (
    <form action={salvarProduto} className="grid gap-3 sm:grid-cols-6">
      {p && <input type="hidden" name="id" value={p.id} />}
      <Campo rotulo="Nome" className="sm:col-span-3"><input name="nome" defaultValue={p?.nome} required className={inp} /></Campo>
      <Campo rotulo="Preço (R$)" className="sm:col-span-1"><input name="preco" type="number" step="0.01" min="0" defaultValue={p?.preco} required className={inp} /></Campo>
      <Campo rotulo="Categoria" className="sm:col-span-2">
        <select name="categoria_id" defaultValue={p?.categoria_id} className={inp}>{cats.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
      </Campo>
      <Campo rotulo="Descrição" className="sm:col-span-3"><input name="descricao" defaultValue={p?.descricao ?? ""} className={inp} /></Campo>
      <Campo rotulo="Tamanho (ex.: 240 ml)" className="sm:col-span-2"><input name="tamanho" defaultValue={p?.tamanho_descricao ?? ""} className={inp} /></Campo>
      <Campo rotulo="Ordem"><input name="ordem" type="number" defaultValue={p?.ordem ?? 0} className={inp} /></Campo>
      <Campo rotulo="Foto" className="sm:col-span-3"><input name="foto" type="file" accept="image/*" className="w-full text-sm" /></Campo>
      <Campo rotulo="Ingredientes (separados por vírgula)" className="sm:col-span-3"><input name="ingredientes" defaultValue={p?.ingredientes?.join(", ") ?? ""} className={inp} /></Campo>
      <Campo rotulo="Como é feito (um passo por linha)" className="sm:col-span-3"><textarea name="preparo" rows={3} defaultValue={p?.preparo?.join("\n") ?? ""} className="w-full rounded-xl border border-stone-300 bg-white p-3" /></Campo>
      <Campo rotulo="Opções do cliente (uma por linha, ex.: Açúcar: Sem açúcar | Normal | Adoçante)" className="sm:col-span-6"><textarea name="opcoes" rows={2} defaultValue={(p?.opcoes ?? []).map((o: any) => `${o.nome}: ${o.escolhas.join(" | ")}`).join("\n")} className="w-full rounded-xl border border-stone-300 bg-white p-3" /></Campo>
      <fieldset className="flex flex-wrap items-end gap-4 pb-2 sm:col-span-3">
        <legend className="sr-only">Alergênicos e estado</legend>
        {ALERG.map(([v, t]) => (
          <label key={v} className="flex items-center gap-2 text-sm"><input type="checkbox" name="alergenicos" value={v} defaultChecked={p?.alergenicos?.includes(v)} className="h-5 w-5" />{t}</label>
        ))}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ativo" defaultChecked={p ? p.ativo : true} className="h-5 w-5" />Ativo</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="esgotado" defaultChecked={p?.esgotado} className="h-5 w-5" />Esgotado</label>
      </fieldset>
      <button className={`${btn} sm:col-span-2`}>{p ? "Salvar produto" : "Criar produto"}</button>
    </form>
  );
}

export default async function Page() {
  const sb = await createClient();
  const [{ data: cats }, { data: prods }] = await Promise.all([
    sb.from("categorias").select("id,nome").order("ordem"),
    sb.from("produtos").select("*, variacoes(id,nome,preco_delta), adicionais(id,nome,preco)").order("ordem"),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Produtos</h1>
      <p className="text-sm text-muted">A alteração de preço vale na hora para pedidos novos; pedidos antigos guardam o preço do momento.</p>
      <details className="rounded-2xl bg-white p-4">
        <summary className="min-h-11 cursor-pointer font-semibold leading-[2.75rem]">Novo produto</summary>
        <div className="mt-3"><FormProduto cats={cats ?? []} /></div>
      </details>
      {(cats ?? []).map((c) => (
        <section key={c.id}>
          <h2 className="mb-2 mt-4 font-display text-lg font-bold">{c.nome}</h2>
          <div className="space-y-2">
            {(prods ?? []).filter((p) => p.categoria_id === c.id).map((p) => (
              <details key={p.id} className="rounded-2xl bg-white p-4">
                <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2">
                  <span className="font-semibold">{p.nome}{!p.ativo && " (inativo)"}{p.esgotado && " · esgotado"}</span>
                  <span>{formatBRL(p.preco)}</span>
                </summary>
                <div className="mt-3 space-y-4">
                  <FormProduto p={p} cats={cats ?? []} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <h3 className="font-semibold">Variações (tamanhos)</h3>
                      <ul className="mt-1 text-sm">{p.variacoes.map((v: any) => (
                        <li key={v.id} className="flex items-center justify-between">{v.nome} (+{formatBRL(v.preco_delta)})<Excluir tabela="variacoes" id={v.id} rotulo="Remover" /></li>))}</ul>
                      <form action={adicionarVariacao} className="mt-2 flex gap-2">
                        <input type="hidden" name="produto_id" value={p.id} />
                        <input name="nome" placeholder="Ex.: G" required aria-label="Nome da variação" className={inp} />
                        <input name="valor" type="number" step="0.01" placeholder="+ R$" aria-label="Acréscimo" className={`${inp} w-28`} />
                        <button className={btn}>+</button>
                      </form>
                    </div>
                    <div>
                      <h3 className="font-semibold">Adicionais</h3>
                      <ul className="mt-1 text-sm">{p.adicionais.map((a: any) => (
                        <li key={a.id} className="flex items-center justify-between">{a.nome} ({formatBRL(a.preco)})<Excluir tabela="adicionais" id={a.id} rotulo="Remover" /></li>))}</ul>
                      <form action={adicionarAdicional} className="mt-2 flex gap-2">
                        <input type="hidden" name="produto_id" value={p.id} />
                        <input name="nome" placeholder="Ex.: Chantilly" required aria-label="Nome do adicional" className={inp} />
                        <input name="valor" type="number" step="0.01" placeholder="R$" aria-label="Preço extra" className={`${inp} w-28`} />
                        <button className={btn}>+</button>
                      </form>
                    </div>
                  </div>
                  <Excluir tabela="produtos" id={p.id} rotulo="Excluir produto" />
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
