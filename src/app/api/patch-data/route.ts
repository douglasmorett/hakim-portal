import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { prismaFirehub } from "@/lib/prismaFirehub";
import { getAsaasKey } from "@/lib/asaas";

export async function GET() {
  const log: string[] = [];
  try {
    log.push("Iniciando Data Patch...");

    // ── 1. ALTERAÇÃO DE E-MAIL DO FABIANO NO BANCO HAKIM ──
    const userFabianoHakim = await prisma.user.findUnique({
      where: { id: "cmornm4wd0000l804s0jy0eit" }
    });

    if (userFabianoHakim) {
      const oldEmail = userFabianoHakim.email;
      await prisma.user.update({
        where: { id: "cmornm4wd0000l804s0jy0eit" },
        data: { email: "contatohakim@gmail.com" }
      });
      log.push(`E-mail do Fabiano atualizado no banco Hakim: de ${oldEmail} para contatohakim@gmail.com`);
    } else {
      log.push("Aviso: Fabiano não encontrado no banco Hakim pelo ID.");
    }

    // ── 2. ALTERAÇÃO DE E-MAIL DO FABIANO NO BANCO FIREHUB ──
    try {
      const userFabianoFb = await prismaFirehub.user.findFirst({
        where: { email: { contains: "tst.fabiano.andrade@gmail.com", mode: "insensitive" } }
      });

      if (userFabianoFb) {
        await prismaFirehub.user.update({
          where: { id: userFabianoFb.id },
          data: { email: "contatohakim@gmail.com" }
        });
        log.push(`E-mail do Fabiano atualizado no banco FireHub: de ${userFabianoFb.email} para contatohakim@gmail.com`);
      } else {
        log.push("Aviso: Fabiano não encontrado no banco FireHub pelo e-mail antigo.");
      }
    } catch (err: any) {
      log.push(`Aviso: Falha ao atualizar Fabiano no banco FireHub: ${err.message || err}`);
    }

    // ── 3. ATUALIZAÇÃO DO CLIENTE NO ASAAS ──
    const asaasKey = getAsaasKey();
    if (asaasKey) {
      const BASE = asaasKey.startsWith("$aact_prod")
        ? "https://api.asaas.com/v3"
        : "https://sandbox.asaas.com/v3";

      try {
        // Busca o cliente pelo e-mail antigo
        const resSearch = await fetch(`${BASE}/customers?email=tst.fabiano.andrade%40gmail.com`, {
          headers: { access_token: asaasKey }
        });

        if (resSearch.ok) {
          const dataSearch = await resSearch.json();
          if (dataSearch.data && dataSearch.data.length > 0) {
            const customer = dataSearch.data[0];
            // Atualiza o e-mail do cliente
            const resUpdate = await fetch(`${BASE}/customers/${customer.id}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                access_token: asaasKey
              },
              body: JSON.stringify({
                email: "contatohakim@gmail.com"
              })
            });

            if (resUpdate.ok) {
              log.push(`Cliente Asaas [ID: ${customer.id}] atualizado: e-mail alterado para contatohakim@gmail.com`);
            } else {
              const errTxt = await resUpdate.text();
              log.push(`Erro ao atualizar cliente Asaas [ID: ${customer.id}]: ${errTxt}`);
            }
          } else {
            log.push("Aviso: Nenhum cliente com e-mail tst.fabiano.andrade@gmail.com encontrado no Asaas.");
          }
        } else {
          log.push(`Erro ao buscar cliente no Asaas: ${await resSearch.text()}`);
        }
      } catch (err: any) {
        log.push(`Erro na integração com Asaas: ${err.message || err}`);
      }
    } else {
      log.push("Aviso: ASAAS_API_KEY não configurada. Atualização no Asaas pulada.");
    }

    // ── 4. ATUALIZAÇÃO DO PREÇO DA MASSA DE ESFIRRA ──
    const massaId = "cmoiyheqm0000ju041m5ae774";
    const prodMassaHakim = await prisma.product.findUnique({
      where: { id: massaId }
    });

    if (prodMassaHakim) {
      await prisma.product.update({
        where: { id: massaId },
        data: { price: 235.00 }
      });
      log.push(`Preço da Massa de Esfirra (cmoiyheqm0000ju041m5ae774) atualizado no banco Hakim para R$ 235,00`);
    } else {
      log.push("Aviso: Produto Massa de Esfirra não encontrado no banco Hakim pelo ID.");
    }

    try {
      const prodMassaFb = await prismaFirehub.product.findUnique({
        where: { id: massaId }
      });

      if (prodMassaFb) {
        await prismaFirehub.product.update({
          where: { id: massaId },
          data: { price: 235.00 }
        });
        log.push(`Preço da Massa de Esfirra (cmoiyheqm0000ju041m5ae774) atualizado no banco FireHub para R$ 235,00`);
      } else {
        log.push("Aviso: Produto Massa de Esfirra não encontrado no banco FireHub pelo ID.");
      }
    } catch (err: any) {
      log.push(`Aviso: Falha ao atualizar preço da massa no banco FireHub: ${err.message || err}`);
    }

    // ── 5. CRIAÇÃO DOS TRIGGERS DE OVERRIDE PARA O PAULO ──
    // Trigger para alterar o preço para 200.00 se for o Paulo e o produto for a massa de esfirra
    const pgSqlTriggerFunc = `
      CREATE OR REPLACE FUNCTION process_order_item_price()
      RETURNS TRIGGER AS $$
      DECLARE
        v_userId VARCHAR;
      BEGIN
        -- Busca o userId do pedido
        SELECT "userId" INTO v_userId FROM "Order" WHERE id = NEW."orderId";
        
        -- Se for o Paulo (cmos34hwu0000l404nppk13ve) e o produto for a massa de esfirra (cmoiyheqm0000ju041m5ae774)
        IF v_userId = 'cmos34hwu0000l404nppk13ve' AND NEW."productId" = 'cmoiyheqm0000ju041m5ae774' THEN
          NEW.price := 200.00;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;

    const pgSqlTriggerCreate = `
      DROP TRIGGER IF EXISTS trg_order_item_price_override ON "OrderItem";
      CREATE TRIGGER trg_order_item_price_override
      BEFORE INSERT OR UPDATE ON "OrderItem"
      FOR EACH ROW
      EXECUTE FUNCTION process_order_item_price();
    `;

    const pgSqlRecalcFunc = `
      CREATE OR REPLACE FUNCTION update_order_total_amount()
      RETURNS TRIGGER AS $$
      DECLARE
        v_orderId VARCHAR;
        v_total NUMERIC;
      BEGIN
        IF TG_OP = 'DELETE' THEN
          v_orderId := OLD."orderId";
        ELSE
          v_orderId := NEW."orderId";
        END IF;

        -- Calcula o novo total somando os itens
        SELECT COALESCE(SUM(price * quantity), 0) INTO v_total FROM "OrderItem" WHERE "orderId" = v_orderId;

        -- Atualiza o pedido
        UPDATE "Order" SET "totalAmount" = v_total WHERE id = v_orderId;

        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `;

    const pgSqlRecalcCreate = `
      DROP TRIGGER IF EXISTS trg_order_total_recalc ON "OrderItem";
      CREATE TRIGGER trg_order_total_recalc
      AFTER INSERT OR UPDATE OR DELETE ON "OrderItem"
      FOR EACH ROW
      EXECUTE FUNCTION update_order_total_amount();
    `;

    // Executa no banco Hakim
    try {
      await prisma.$executeRawUnsafe(pgSqlTriggerFunc);
      await prisma.$executeRawUnsafe(pgSqlTriggerCreate);
      await prisma.$executeRawUnsafe(pgSqlRecalcFunc);
      await prisma.$executeRawUnsafe(pgSqlRecalcCreate);
      log.push("Triggers de override de preço criados com sucesso no banco de dados Hakim (PostgreSQL).");
    } catch (err: any) {
      log.push(`Erro ao criar triggers no banco Hakim: ${err.message || err}`);
    }

    // Executa no banco FireHub (se conexao ativa e for banco separado)
    try {
      await prismaFirehub.$executeRawUnsafe(pgSqlTriggerFunc);
      await prismaFirehub.$executeRawUnsafe(pgSqlTriggerCreate);
      await prismaFirehub.$executeRawUnsafe(pgSqlRecalcFunc);
      await prismaFirehub.$executeRawUnsafe(pgSqlRecalcCreate);
      log.push("Triggers de override de preço criados com sucesso no banco de dados FireHub (PostgreSQL).");
    } catch (err: any) {
      log.push(`Aviso: Falha ao criar triggers no banco FireHub: ${err.message || err}`);
    }

    log.push("Patch concluído com sucesso!");
    return NextResponse.json({ success: true, log });
  } catch (error: any) {
    log.push(`FATAL: ${error.message || error}`);
    return NextResponse.json({ success: false, log, error: error.message || error }, { status: 500 });
  }
}
