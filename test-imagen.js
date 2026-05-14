const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function main() {
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-001',
      prompt: 'Caixa de embalagem de papelão kraft para alimentos, fundo totalmente branco, isolado, embalagem profissional',
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
      }
    });
    
    if (response.generatedImages && response.generatedImages.length > 0) {
      const b64 = response.generatedImages[0].image.imageBytes;
      fs.writeFileSync('test.jpg', Buffer.from(b64, 'base64'));
      console.log('Success! Saved test.jpg');
    } else {
      console.log('No image generated', response);
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}
main();
