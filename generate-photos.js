const { PrismaClient } = require('@prisma/client');
const { put } = require('@vercel/blob');
const { GoogleGenAI } = require('@google/genai');

require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: 'AIzaSyDdfsUv9UPZOpTKyGtQfZxRmesYqlNKyZQ' });
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

async function generateAndUploadImage(id, name) {
  try {
    const prompt = `Embalagem profissional de produto alimentício: ${name}. Fundo 100% branco, isolado, iluminação de estúdio, fotorrealista. Padrão de e-commerce e catálogo de atacado.`;
    console.log(`Gerando para: ${name}...`);
    
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
      }
    });

    if (!response.generatedImages || response.generatedImages.length === 0) {
      throw new Error("No image generated");
    }

    const b64 = response.generatedImages[0].image.imageBytes;
    const buffer = Buffer.from(b64, 'base64');
    
    console.log(`Fazendo upload para Vercel Blob: ${name}...`);
    const blob = await put(`produtos/ai-${id}-${Date.now()}.jpg`, buffer, {
      access: 'public',
      token: blobToken,
      contentType: 'image/jpeg'
    });

    console.log(`Upload completo: ${blob.url}`);

    await prisma.product.update({
      where: { id },
      data: { imageUrl: blob.url }
    });
    console.log(`Produto ${name} atualizado no BD!`);
  } catch (e) {
    console.error(`Falha no produto ${name}:`, e.message);
  }
}

async function main() {
  const products = await prisma.product.findMany({
    where: { OR: [{ imageUrl: null }, { imageUrl: '' }] }
  });

  console.log(`Encontrados ${products.length} produtos sem foto.`);

  for (const p of products) {
    await generateAndUploadImage(p.id, p.name);
    // Pausa pequena para não estourar rate limit
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log('Finalizado!');
}

main().finally(() => prisma.$disconnect());
