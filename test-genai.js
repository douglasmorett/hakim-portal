require('dotenv').config({ path: '.env.local' });
const { GoogleGenAI } = require("@google/genai");

async function main() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  // create dummy 1x1 jpeg base64
  const base64Data = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
            "What is this?",
            {
                inlineData: {
                    data: base64Data,
                    mimeType: "image/jpeg"
                }
            }
        ]
    });
    console.log("Success:", response.text);
  } catch (err) {
    console.error("Error:", err);
  }
}
main().catch(console.error);
