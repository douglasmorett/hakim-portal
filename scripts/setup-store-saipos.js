const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // 1. Atualizar dados da loja (banner, logo, endereço, horários)
  const updated = await prisma.user.update({
    where: { slug: "hakim-unamar" },
    data: {
      storeBanner: "https://static.saipos.com/saipos-estatico/site-data/87477/cover/367b83e004b0602adf8a7e9a5b5ad34blogoHakim.jpg",
      storeLogo: "https://static.saipos.com/saipos-estatico/site-data/87477/logo/367b83e004b0602adf8a7e9a5b5ad34blogoHakim.jpg",
      storeAddress: "Rodovia Amaral Peixoto, 252",
      storeDeliveryOnly: true,
      storeHours: [
        { day: "Segunda", open: "10:00", close: "23:30", active: true },
        { day: "Terça", open: "10:00", close: "23:30", active: true },
        { day: "Quarta", open: "10:00", close: "23:30", active: true },
        { day: "Quinta", open: "10:00", close: "23:30", active: true },
        { day: "Sexta", open: "10:00", close: "23:30", active: true },
        { day: "Sábado", open: "10:00", close: "23:30", active: true },
        { day: "Domingo", open: "10:00", close: "23:30", active: false }
      ]
    }
  });
  console.log("✅ Loja atualizada:", updated.storeName, "| Banner:", !!updated.storeBanner, "| Logo:", !!updated.storeLogo);

  // 2. Mapear fotos dos produtos do Saipos
  const photoMap = {
    "Esfirra de Queijo Temperado": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/f6054e68e5375b648fe07561009b599b.png",
    "4 Esfirras de Queijo Temperado": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/a8d87d45bbc5bf2440beea1372e46623.png",
    "4 Esfirras de Calabresa": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/fe12695380fba746ea90667c87f0fded.png",
    "4 Esfirras de Carne": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/643f5dd18dd52db6f2db5c59e749d70f.png",
    "3 Esfirras Doces": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/b94c78440044cbcd0a7190bf2cc64101.png",
    "Combo 6 Esfirras Mix": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/4095154c729693b6152c6d3bebc29fdf.png",
    "4 Pasteis de Nata": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/0fdc5d0602f89e19043d48bdec39ce47.png",
    "Combo do Solteiro": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/237793085e5360cf8c40c3d2cbfe72a1.png",
    "Combo 10 Esfirras Simples + 2 Bebidas": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/c4bfaa9fec1133db4f323a954d618ab3.png",
    "Monte seu Combo (10 itens Variados)": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/c5f73e03851d5f8160c0e873df35c702.png",
    "20 Esfihas do Sábio": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/1f0d3f5f6952358b67f567840ead3829.png",
    "10 Esfirras Premium + 2 Bebidas": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/63aee3da4ae7c1b2d35ef98f50b53459.png",
    "Rodízio do Sábio": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/4e440cf5bdca583b29ee601416841402.png",
    "Doguinho": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/aa136cefaae5f00aa4ff3e07aa90df40.png",
    "Pastel de Nata": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/e9515b07dbd75a9096a1298903c1e7c2.png",
    "Maionese Da casa Ervas Finas": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/e756e0371a37847062e3bd9230a3600b.png",
    "Esfirra de Carne": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/bd16c8e1200ac3572720d373e9e40329.png",
    "Esfirra de Calabresa": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/a0bada0f86358738159362f1bf5e4649.png",
    "Esfirra de Frango": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/1b5e4e22cd2fd448c99385a8a542d273.png",
    "Esfirra de Queijo c/ presunto": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/bb34df4d369e0dd56bc936437fcaa16b.png",
    "Esfirra de Queijo": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/dde03c764cbacfd880f728a1fab276b6.png",
    "Esfirra de Bacon": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/780aadfb190c459d684c5300ad9d5338.png",
    "Esfirra de Carne c/ Mussarela": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/b665e44d3a3c87b628e51c747d734ea7.png",
    "Esfirra de Carne c/ Alho Torrado": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/fc04069d5326e494090b4e6c50d6555c.png",
    "Esfirra de Carne c/ Catupiry": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/0fc9ead4ae5fdc288b570226e0a2141b.png",
    "Esfirra de Frango c/ Catupiry": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/4d736509b013ab510d06eccedbf14e48.png",
    "Esfirra de Frango c/ Cheddar": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/bc270a8c2e9b4e4ac644982c545f7284.png",
    "Esfirra de Azeitona": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/1e1f8b79cd559a0fe0368429af314b09.png",
    "Esfirra de Alho Torrado": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/ed47aef2e13d0191b67f1c5fe3c5620f.png",
    "Esfirra de Bacon c/ Catupiry": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/50976154901e45fae1e4a6532fe3b5b3.png",
    "Esfirra de Bacon c/ Cheddar": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/ab625c2709a7999d52f2fba7e81bcc0f.png",
    "Esfirra de 4 queijos": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/9c9a7c047950232d6a569847f462520d.png",
    "Esfirra 5 Queijos": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/4904b28bd36cb9acabfda9a99a681983.png",
    "Esfirra de Peperoni": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/4d1c91c7c3df11e803f94a2c0ed9cd8b.png",
    "Esfirra Peperoni c/ Catupiry": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/811c4bf4d9cf141ff757168028bfa1c3.png",
    "Esfirra de Peperoni c/ Catupiry + Alho torrado": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/79becb34df0a344a79c35f28f900ff31.png",
    "Banoffe": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/cff2493ebb649c5700d884108262162e.png",
    "Esfirra de Romeu e Julieta": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/414781463ebb86fd38f9733db46aa11c.png",
    "Esfirra de Chocolate ao Leite": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/beec298ddb176e5961b2b2a8e1c6942e.png",
    "Esfirra de Chocolate Branco": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/75dd60c8b841fd4540651241e42cd84a.png",
    "Esfirra de Doce de Leite": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/672ae4b4991a9d003a9d71b046ae858b.png",
    "Esfirra Duo": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/ea2e156736f6ee0db64fc35165d3c746.png",
    "Esfirra de Chocolate c/ Banana": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/ef820f48b265e2aa3d03b0f7b4a9abb3.png",
    "Esfirra de Banana c/ Canela": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/22bd409ec45bba04e7bb3a366426936a.png",
    "Esfirra de Banana Nevada": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/0e2019510e12a3088ae0ba896ba1978b.png",
    "Esfirra de Chocolate c/ Morango": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/6f2fa5cf785c0f1beb2546b6a5f1e68b.png",
    "Esfirra de M&M": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/048356c1d6531cb8e7aafa9269a620ca.png",
    "Esfirra de Kitkat": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/0e91755e876dab294db1cdf16fd5770e.png",
    "Coca-Cola lata": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/e07b9b70fa51478d5c43c6e59e69322f.png",
    "Coca-Cola Zero": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/6b666ea9ccb222a21fcf10c9dad9a3dd.png",
    "Del Valle Uva lata": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/b83e43f72fb648bfecc99772e3e726f5.png",
    "Del valle lata Maracuja": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/11c94f4b257e92bd6ccd104261e3d155.png",
    "Sprite Lata": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/7e4b7985ad292b984d084849a08e55c8.png",
    "Fanta Laranja lata": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/d75cf34e56c322e6f0747596115b22ed.png",
    "Fanta Uva lata": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/9709c5f84bd8297ee77f1e9864973dda.png",
    "Água c/ Gás": "https://static.saipos.com/saipos-estatico/img-items/87477/store_item/4191278641816962474eabdbfc1c1a71.png",
  };

  // Atualizar fotos dos produtos
  let updated_count = 0;
  for (const [name, url] of Object.entries(photoMap)) {
    const result = await prisma.menuProduct.updateMany({
      where: { name: { equals: name, mode: "insensitive" } },
      data: { imageUrl: url }
    });
    if (result.count > 0) {
      updated_count++;
      console.log(`  📸 ${name} → foto atualizada`);
    }
  }

  // Tentar match parcial para os que não deram match exato
  const allProducts = await prisma.menuProduct.findMany({ where: { active: true, imageUrl: null } });
  for (const prod of allProducts) {
    for (const [name, url] of Object.entries(photoMap)) {
      if (prod.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(prod.name.toLowerCase())) {
        await prisma.menuProduct.update({ where: { id: prod.id }, data: { imageUrl: url } });
        updated_count++;
        console.log(`  📸 ${prod.name} → foto via match parcial`);
        break;
      }
    }
  }

  console.log(`\n✅ Total: ${updated_count} produtos atualizados com fotos do Saipos`);
  
  // Listar produtos sem foto
  const semFoto = await prisma.menuProduct.findMany({ where: { active: true, imageUrl: null } });
  if (semFoto.length > 0) {
    console.log(`\n⚠️ ${semFoto.length} produtos ainda sem foto:`);
    semFoto.forEach(p => console.log(`   - ${p.name}`));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
