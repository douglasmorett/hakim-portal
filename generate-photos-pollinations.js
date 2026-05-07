const { PrismaClient } = require('@prisma/client');
const { put } = require('@vercel/blob');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

const fetchWithTimeout = async (resource, options = {}) => {
  const { timeout = 25000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, { ...options, signal: controller.signal });
  clearTimeout(id);
  return response;
};

async function generateAndUploadImage(id, name) {
  try {
    const prompt = `Embalagem profissional de produto alimenticio ${name}, fundo branco isolado, estilo de catalogo supermercado atacado, pacote, caixa ou saco realista, embalagem 3d.`;
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=600&height=600&nologo=true&model=flux`;
    
    console.log(`[${name}] Iniciando...`);
    
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error("Erro HTTP " + response.status);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const blob = await put(`produtos/ai-${id}-${Date.now()}.jpg`, buffer, {
      access: 'public',
      token: blobToken,
      contentType: 'image/jpeg'
    });

    await prisma.product.update({
      where: { id },
      data: { imageUrl: blob.url }
    });
    console.log(`[${name}] Sucesso: ${blob.url}`);
  } catch (e) {
    console.error(`[${name}] Falhou:`, e.message);
  }
}

async function main() {
  const products = await prisma.product.findMany({
    where: { OR: [{ imageUrl: null }, { imageUrl: '' }] }
  });

  console.log(`Encontrados ${products.length} produtos sem foto.`);

  // Processa em lotes de 3 para não sobrecarregar
  for (let i = 0; i < products.length; i += 3) {
    const batch = products.slice(i, i + 3);
    console.log(`\n--- Processando lote ${i/3 + 1} ---`);
    await Promise.all(batch.map(p => generateAndUploadImage(p.id, p.name)));
  }
  
  console.log('\nFinalizado!');
}

main().finally(() => prisma.$disconnect());
