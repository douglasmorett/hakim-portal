const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const mockData = {
  default: {
    shelfLifeDays: 90,
    weightStr: "1,00 kg",
    ingredients: "Produto alimentar base, conservantes (INS 202, INS 211).",
    allergens: "PODE CONTER DERIVADOS DE LEITE E SOJA.",
    preparation: "Descongelar sob refrigeração por 12 horas antes do uso.\nAqueça a 180ºC por 5 a 10 minutos dependendo do equipamento.",
    highSugar: false,
    highSodium: true,
    highFat: false,
    transgenic: true,
    energy: "250",
    carbs: "12",
    sugars: "2",
    addedSugars: "0",
    proteins: "15",
    fatTotal: "16",
    fatSat: "5",
    sodium: "450"
  },
  "Pastel de Nata 48 und": {
    shelfLifeDays: 90,
    weightStr: "0,90 kg",
    ingredients: "Água, leite, açúcar, farinha de trigo enriquecida com ferro e ácido fólico, gema de ovo, margarina 80% de lipídios...",
    allergens: "CONTÉM OVO, LEITE, DERIVADOS DE SOJA E TRIGO. PODE CONTER AVEIA, CENTEIO, CEVADA. CONTÉM LACTOSE. CONTÉM GLÚTEN.",
    preparation: "1) Preaqueça o seu equipamento por 10 minutos.\n2) Coloque em uma assadeira e aqueça a 180°C por 10 a 12 min.\nUma vez descongelado, não deve ser congelado novamente.",
    highSugar: true,
    highSodium: false,
    highFat: false,
    transgenic: true,
    energy: "153",
    carbs: "25",
    sugars: "18",
    addedSugars: "17",
    proteins: "2,6",
    fatTotal: "4,7",
    fatSat: "2,0",
    sodium: "73"
  },
  "Nutella 3kg": {
    shelfLifeDays: 180,
    weightStr: "3,00 kg",
    ingredients: "Açúcar, óleo de palma, avelãs (13%), cacau em pó parcialmente desengordurado (7,4%), leite desnatado em pó (6,6%), soro de leite em pó, emulsificante lecitinas, aromatizante.",
    allergens: "CONTÉM AVELÃS, DERIVADOS DE LEITE E SOJA. CONTÉM LACTOSE. NÃO CONTÉM GLÚTEN.",
    preparation: "Pronto para o consumo. Manter em temperatura ambiente.",
    highSugar: true,
    highSodium: false,
    highFat: true,
    transgenic: true,
    energy: "539", carbs: "57", sugars: "56", addedSugars: "56", proteins: "6,3", fatTotal: "31", fatSat: "11", sodium: "42"
  },
  "Salsicha 5kg": {
    shelfLifeDays: 60,
    weightStr: "5,00 kg",
    ingredients: "Carne mecanicamente separada de ave, carne suína, água, gordura suína, sal, proteína de soja...",
    allergens: "CONTÉM DERIVADOS DE SOJA. PODE CONTER LEITE.",
    preparation: "Cozinhar em água fervente por 5 minutos antes do consumo.",
    highSugar: false,
    highSodium: true,
    highFat: true,
    transgenic: true,
    energy: "230", carbs: "3", sugars: "0", addedSugars: "0", proteins: "12", fatTotal: "19", fatSat: "6", sodium: "800"
  },
  "4 Queijos 3kg": {
    shelfLifeDays: 90,
    weightStr: "3,00 kg",
    ingredients: "Mussarela, provolone, parmesão, gorgonzola. Antiaglutinante celulose microcristalina.",
    allergens: "CONTÉM LEITE E DERIVADOS. CONTÉM LACTOSE.",
    preparation: "Pronto para uso como recheio ou cobertura. Derreter a 200ºC por 3 a 5 minutos.",
    highSugar: false,
    highSodium: true,
    highFat: true,
    transgenic: false,
    energy: "320", carbs: "2", sugars: "0", addedSugars: "0", proteins: "24", fatTotal: "25", fatSat: "15", sodium: "550"
  }
};

async function seedLabels() {
  const products = await prisma.product.findMany();
  let count = 0;

  for (const p of products) {
    // Só atualiza se ainda não tiver labelData para não sobescrever o que o usuário já fez
    if (!p.labelData) {
      let data = mockData[p.name] || { ...mockData.default, weightStr: p.name.includes("kg") ? p.name.match(/\d+[\.,]?\d*\s*kg/)?.[0] || "1,00 kg" : "1,00 kg" };
      await prisma.product.update({
        where: { id: p.id },
        data: { labelData: data }
      });
      count++;
    }
  }

  console.log(`Preenchidas as informações de rótulo para ${count} produtos.`);
}

seedLabels().finally(() => prisma.$disconnect());
