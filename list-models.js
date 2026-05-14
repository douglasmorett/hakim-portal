const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env.local' });
// Or we can just pass the key from Firecheck
const ai = new GoogleGenAI({ apiKey: 'AIzaSyDdfsUv9UPZOpTKyGtQfZxRmesYqlNKyZQ' });

async function listModels() {
  try {
    const response = await ai.models.list();
    // In @google/genai list() might return an async iterator
    for await (const model of response) {
      console.log(model.name);
    }
  } catch (e) {
    console.error(e.message);
  }
}
listModels();
