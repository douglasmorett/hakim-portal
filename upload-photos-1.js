const { PrismaClient } = require('@prisma/client');
const { put } = require('@vercel/blob');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

const images = [
  { id: "cmoiyffqc0000l404uffcjefz", path: "C:\\Users\\FINANCEIRO\\.gemini\\antigravity\\brain\\e66e4496-a64a-4d17-b35e-ecf6e119866c\\carne_embalagem_1777919751846.png" },
  { id: "cmoiywtqr0003jr041az0w3km", path: "C:\\Users\\FINANCEIRO\\.gemini\\antigravity\\brain\\e66e4496-a64a-4d17-b35e-ecf6e119866c\\frango_embalagem_1777919767024.png" },
  { id: "cmoiyheqm0000ju041m5ae774", path: "C:\\Users\\FINANCEIRO\\.gemini\\antigravity\\brain\\e66e4496-a64a-4d17-b35e-ecf6e119866c\\massas_embalagem_1777919779886.png" }
];

async function main() {
  for (const img of images) {
    if (!fs.existsSync(img.path)) {
      console.log('Not found:', img.path);
      continue;
    }
    const buffer = fs.readFileSync(img.path);
    const blob = await put(`produtos/ai-${img.id}-${Date.now()}.png`, buffer, {
      access: 'public',
      token: blobToken,
      contentType: 'image/png'
    });
    
    await prisma.product.update({
      where: { id: img.id },
      data: { imageUrl: blob.url }
    });
    console.log(`Uploaded and updated ${img.id}: ${blob.url}`);
  }
}

main().finally(() => prisma.$disconnect());
