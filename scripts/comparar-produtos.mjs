/**
 * Compara o catálogo do PORTAL com o do FIREHUB (o que o cliente compra).
 *
 * Sem `--aplicar` não escreve NADA: só mostra a diferença.
 * Com `--aplicar`, copia os valores do portal para o firehub_db.
 *
 * Casa por `id` — os dois bancos nasceram do mesmo, então os ids batem. Quando
 * não bate por id, tenta por nome antes de desistir: produto recriado à mão de
 * um lado teria id novo, e criar de novo geraria duplicata na loja.
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";

function lerEnv(arquivo) {
  const t = fs.readFileSync(arquivo, "utf8");
  const out = {};
  for (const linha of t.split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

const env = { ...lerEnv(".env"), ...(fs.existsSync(".env.local") ? lerEnv(".env.local") : {}) };
const URL_PORTAL = env.DATABASE_URL;
const URL_FIREHUB = env.FIREHUB_DATABASE_URL;
if (!URL_PORTAL || !URL_FIREHUB) {
  console.error("Falta DATABASE_URL ou FIREHUB_DATABASE_URL no .env");
  process.exit(1);
}
if (URL_PORTAL === URL_FIREHUB) {
  console.log("Os dois apontam para o MESMO banco — nada a comparar.");
  process.exit(0);
}

const portal = new PrismaClient({ datasourceUrl: URL_PORTAL });
const firehub = new PrismaClient({ datasourceUrl: URL_FIREHUB });

const CAMPOS = {
  id: true, name: true, description: true, price: true,
  imageUrl: true, category: true, active: true, franchiseOnly: true,
};

const aplicar = process.argv.includes("--aplicar");
const brl = (n) => "R$ " + Number(n).toFixed(2).replace(".", ",");

try {
  const [ps, fs_] = await Promise.all([
    portal.product.findMany({ select: CAMPOS, orderBy: { name: "asc" } }),
    firehub.product.findMany({ select: CAMPOS, orderBy: { name: "asc" } }),
  ]);

  console.log(`portal:  ${ps.length} produtos`);
  console.log(`firehub: ${fs_.length} produtos\n`);

  const porId = new Map(fs_.map((p) => [p.id, p]));
  const porNome = new Map(fs_.map((p) => [p.name.trim().toLowerCase(), p]));
  const usados = new Set();

  const paraAtualizar = [];
  const paraCriar = [];

  for (const p of ps) {
    let alvo = porId.get(p.id);
    let casouPor = "id";
    if (!alvo) { alvo = porNome.get(p.name.trim().toLowerCase()); casouPor = "nome"; }
    if (!alvo) { paraCriar.push(p); continue; }
    usados.add(alvo.id);

    const difs = [];
    for (const c of ["name", "description", "price", "imageUrl", "category", "active", "franchiseOnly"]) {
      const a = p[c] ?? null;
      const b = alvo[c] ?? null;
      if (c === "price" ? Math.abs(Number(a) - Number(b)) > 0.001 : a !== b) {
        difs.push({ campo: c, de: b, para: a });
      }
    }
    if (difs.length > 0) paraAtualizar.push({ p, alvo, difs, casouPor });
  }

  const soNoFirehub = fs_.filter((p) => !usados.has(p.id));

  // ── Relatório ──────────────────────────────────────────────────────────
  if (paraAtualizar.length === 0 && paraCriar.length === 0) {
    console.log("Os dois catálogos já estão iguais nos campos comparados.");
  }

  if (paraAtualizar.length > 0) {
    console.log(`── ${paraAtualizar.length} PRODUTO(S) COM DIFERENÇA ──`);
    for (const { p, difs, casouPor } of paraAtualizar) {
      console.log(`\n  ${p.name}${casouPor === "nome" ? "  (casou por NOME, id diferente)" : ""}`);
      for (const d of difs) {
        const de = d.campo === "price" ? brl(d.de) : JSON.stringify(d.de);
        const para = d.campo === "price" ? brl(d.para) : JSON.stringify(d.para);
        console.log(`      ${d.campo.padEnd(14)} ${de}  →  ${para}`);
      }
    }
    console.log();
  }

  if (paraCriar.length > 0) {
    console.log(`── ${paraCriar.length} PRODUTO(S) SÓ NO PORTAL (seriam criados) ──`);
    for (const p of paraCriar) console.log(`  ${p.name.padEnd(38)} ${brl(p.price)}`);
    console.log();
  }

  if (soNoFirehub.length > 0) {
    console.log(`── ${soNoFirehub.length} PRODUTO(S) SÓ NO FIREHUB ──`);
    console.log("  (NÃO serão apagados: podem ter sido criados direto na loja)");
    for (const p of soNoFirehub) console.log(`  ${p.name.padEnd(38)} ${brl(p.price)}  ${p.active ? "" : "[inativo]"}`);
    console.log();
  }

  if (!aplicar) {
    console.log("── SIMULAÇÃO. Nada foi gravado. Rode com --aplicar para valer. ──");
  } else {
    let atualizados = 0, criados = 0;
    for (const { p, alvo } of paraAtualizar) {
      await firehub.product.update({
        select: { id: true },
        where: { id: alvo.id },
        data: {
          name: p.name, description: p.description, price: p.price,
          imageUrl: p.imageUrl, category: p.category,
          active: p.active, franchiseOnly: p.franchiseOnly,
        },
      });
      atualizados++;
    }
    for (const p of paraCriar) {
      await firehub.product.create({
        select: { id: true },
        data: {
          id: p.id, name: p.name, description: p.description, price: p.price,
          imageUrl: p.imageUrl, category: p.category,
          active: p.active, franchiseOnly: p.franchiseOnly,
        },
      });
      criados++;
    }
    console.log(`── APLICADO: ${atualizados} atualizado(s), ${criados} criado(s). ──`);
  }
} finally {
  await portal.$disconnect();
  await firehub.$disconnect();
}
