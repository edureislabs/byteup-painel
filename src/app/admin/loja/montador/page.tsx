import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/admin";
import { siteUrl } from "@/lib/mercadopago";
import { formatPrice } from "@/lib/storeShared";
import { BUILDER_MODULES, PRIVILEGED_LABEL, readBuilderOptions } from "@/lib/builder/catalog";
import { getBuilderCatalog } from "@/lib/builder/prices";
import { GENERATED_FILES, generatedFiles, moduleOfFile } from "@/lib/builder/build";
import { TEMPLATE_FILES, TEMPLATE_VERSION } from "@/lib/builder/templateFiles";
import { resetBuilderPrices, saveBuilderPrices } from "./actions";

export const dynamic = "force-dynamic";

const reais = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
const linhas = (texto: string) => texto.split("\n").length;

function Arquivo({ nome, conteudo, nota }: { nome: string; conteudo: string; nota?: string }) {
  return (
    <details className="group border-b border-white/5 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-white/[0.03]">
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-[#7d7588] transition-transform group-open:rotate-90">▸</span>
          <code className="truncate font-mono text-[#e9e4f0]">{nome}</code>
          {nota && <span className="shrink-0 rounded-full bg-[#b64cff]/15 px-2 py-0.5 text-[10px] font-bold text-[#d9b4ff]">{nota}</span>}
        </span>
        <span className="shrink-0 text-xs text-[#7d7588]">
          {linhas(conteudo)} linhas · {(conteudo.length / 1024).toFixed(1)} KB
        </span>
      </summary>
      <pre className="max-h-[560px] overflow-auto border-t border-white/5 bg-black/40 px-5 py-4 font-mono text-xs leading-5 text-[#cfc8da]">
        {conteudo}
      </pre>
    </details>
  );
}

export default async function AdminMontadorPage({ searchParams }: { searchParams: Promise<{ salvo?: string; erro?: string }> }) {
  if (!(await getAdminUserId())) notFound();
  const { salvo, erro } = await searchParams;

  const [catalogo, itensPagos] = await Promise.all([
    getBuilderCatalog(),
    prisma.storeOrderItem.findMany({
      where: { productId: null, order: { status: "paid" } },
      select: { priceCents: true, options: true },
    }),
  ]);

  // vendas
  const vendas = itensPagos.map((i) => readBuilderOptions(i.options)).filter(Boolean);
  const faturado = itensPagos.reduce((t, i) => t + i.priceCents, 0);
  const vezes = new Map<string, number>();
  for (const v of vendas) for (const id of v!.modulos) vezes.set(id, (vezes.get(id) ?? 0) + 1);

  // arquivos
  const comuns = Object.entries(TEMPLATE_FILES).filter(([n]) => !moduleOfFile(n) && !(GENERATED_FILES as readonly string[]).includes(n));
  const exemplo = generatedFiles(
    { tipo: "monte-o-seu", modulos: BUILDER_MODULES.map((m) => m.id), nome: "Bot de Teste", cor: "#5865F2" },
    siteUrl()
  );
  const todosAVenda = catalogo.modules.filter((m) => m.active).map((m) => m.id).join(",");

  return (
    <main className="min-h-screen bg-[#08070a] p-6 text-white md:p-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap gap-4 text-sm text-[#7d7588]">
          <Link href="/admin/loja" className="hover:text-white">← Voltar para a loja</Link>
          <Link href="/loja/monte-o-seu" target="_blank" className="hover:text-white">Ver a página ↗</Link>
        </div>
        <h1 className="mt-3 text-3xl font-black">🧩 Monte o seu bot</h1>
        <p className="mt-2 text-sm text-[#aaa3b5]">
          {vendas.length} bot(s) vendido(s) · {formatPrice(faturado)} faturado · código versão <code className="text-[#d9b4ff]">{TEMPLATE_VERSION}</code>
        </p>

        {salvo && <p className="mt-4 rounded-2xl border border-[#7ee2a8]/30 bg-[#7ee2a8]/[0.08] px-4 py-3 text-sm text-[#bff3d4]">✅ Preços salvos. Já valem no site e no Discord.</p>}
        {erro && <p className="mt-4 rounded-2xl border border-[#f07878]/30 bg-[#f07878]/[0.08] px-4 py-3 text-sm text-[#f7c4c4]">❌ {erro}</p>}

        {/* ---------------- preços ---------------- */}
        <h2 className="mt-10 text-xl font-black">Preços</h2>
        <p className="mt-1 text-sm text-[#7d7588]">
          Valores em reais (ex.: 14,90). Desmarque &quot;À venda&quot; para tirar um módulo do site e do Discord. Pedidos já feitos mantêm o preço da compra.
        </p>

        <form action={saveBuilderPrices} className="mt-4 overflow-hidden rounded-3xl border border-white/10">
          <div className="grid grid-cols-[1fr_130px_90px] items-center gap-3 border-b border-white/10 bg-white/[0.03] px-5 py-2 text-xs font-bold uppercase tracking-wider text-[#7d7588]">
            <span>Módulo</span>
            <span>Preço (R$)</span>
            <span className="text-center">À venda</span>
          </div>

          <div className="grid grid-cols-[1fr_130px_90px] items-center gap-3 border-b border-white/5 px-5 py-3">
            <div>
              <div className="font-bold">⚙️ {catalogo.base.name}</div>
              <div className="text-xs text-[#7d7588]">Vai em todo bot · padrão R$ {reais(catalogo.base.defaultPriceCents)}</div>
            </div>
            <input
              name="price_base"
              defaultValue={reais(catalogo.base.priceCents)}
              inputMode="decimal"
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm focus:border-[#b64cff] focus:outline-none"
            />
            <span className="text-center text-xs text-[#7d7588]">sempre</span>
          </div>

          {catalogo.modules.map((m) => (
            <div key={m.id} className="grid grid-cols-[1fr_130px_90px] items-center gap-3 border-b border-white/5 px-5 py-3 last:border-b-0">
              <div className="min-w-0">
                <div className="font-bold">
                  {m.emoji} {m.name}
                  {(vezes.get(m.id) ?? 0) > 0 && <span className="ml-2 text-xs font-normal text-[#7ee2a8]">{vezes.get(m.id)} venda(s)</span>}
                </div>
                <div className="truncate text-xs text-[#7d7588]">
                  {m.commands.length ? `${m.commands.length} comando(s)` : "automático"}
                  {m.privileged?.length ? ` · precisa de ${m.privileged.map((p) => PRIVILEGED_LABEL[p]).join(" e ")}` : ""} · padrão R${" "}
                  {reais(m.defaultPriceCents)}
                </div>
              </div>
              <input
                name={`price_${m.id}`}
                defaultValue={reais(m.priceCents)}
                inputMode="decimal"
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm focus:border-[#b64cff] focus:outline-none"
              />
              <label className="flex justify-center">
                <input type="checkbox" name={`active_${m.id}`} defaultChecked={m.active} className="h-5 w-5 accent-[#b64cff]" />
              </label>
            </div>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.03] px-5 py-4">
            <span className="text-sm text-[#aaa3b5]">
              Tudo junto sai por{" "}
              <strong className="text-white">
                {formatPrice(catalogo.base.priceCents + catalogo.modules.filter((m) => m.active).reduce((t, m) => t + m.priceCents, 0))}
              </strong>
            </span>
            <button className="rounded-2xl bg-[#b64cff] px-6 py-3 text-sm font-bold hover:bg-[#c56bff]">Salvar preços</button>
          </div>
        </form>

        <form action={resetBuilderPrices} className="mt-3 text-right">
          <button className="text-xs text-[#7d7588] underline hover:text-white">Voltar todos para os preços padrão</button>
        </form>

        {/* ---------------- arquivos ---------------- */}
        <div className="mt-12 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">O que vai em cada bot</h2>
            <p className="mt-1 text-sm text-[#7d7588]">
              Clique num arquivo para ver o código. Para mudar o código, edite a pasta <code>bot-template/</code> do painel e faça o deploy.
            </p>
          </div>
          <a
            href={`/api/admin/builder/preview?modulos=${todosAVenda}`}
            className="rounded-2xl border border-white/15 px-5 py-2.5 text-sm font-bold hover:border-[#b64cff]"
          >
            ⬇ Baixar bot de teste (.zip)
          </a>
        </div>

        <h3 className="mt-6 text-sm font-bold text-[#d9b4ff]">⚙️ Base — vai em todo bot</h3>
        <div className="mt-2 overflow-hidden rounded-3xl border border-white/10">
          {comuns.map(([nome, conteudo]) => (
            <Arquivo key={nome} nome={nome} conteudo={conteudo} />
          ))}
        </div>

        <h3 className="mt-8 text-sm font-bold text-[#d9b4ff]">📝 Gerados em cada pedido</h3>
        <p className="mt-1 text-xs text-[#7d7588]">Exemplo de um bot chamado &quot;Bot de Teste&quot; com todos os módulos. Mudam conforme o nome e os módulos de cada compra.</p>
        <div className="mt-2 overflow-hidden rounded-3xl border border-white/10">
          {GENERATED_FILES.map((nome) => (
            <Arquivo key={nome} nome={nome} conteudo={exemplo[nome]} nota="gerado" />
          ))}
        </div>

        <h3 className="mt-8 text-sm font-bold text-[#d9b4ff]">🧩 Módulos — só vão se o cliente escolher</h3>
        <div className="mt-2 space-y-3">
          {catalogo.modules.map((m) => {
            const arquivos = Object.entries(TEMPLATE_FILES).filter(([n]) => moduleOfFile(n) === m.id);
            return (
              <div key={m.id} className="overflow-hidden rounded-3xl border border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-white/[0.03] px-5 py-3">
                  <span className="font-bold">
                    {m.emoji} {m.name}{" "}
                    {!m.active && <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-[#aaa3b5]">fora de venda</span>}
                  </span>
                  <span className="text-xs text-[#7d7588]">
                    {m.commands.join(" ") || "sem comandos"}
                    {m.configGroup ? ` · /config ${m.configGroup}` : ""}
                  </span>
                </div>
                {arquivos.length ? (
                  arquivos.map(([nome, conteudo]) => <Arquivo key={nome} nome={nome} conteudo={conteudo} />)
                ) : (
                  <p className="px-5 py-3 text-sm text-[#f07878]">⚠️ Arquivo src/modules/{m.id}.js não encontrado no bot-template.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
