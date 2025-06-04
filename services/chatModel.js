const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function responderChat(prompt) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await axios.post(
      url,
      {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 10000
      }
    );

    const respuesta = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!respuesta) throw new Error("No se recibió respuesta válida del modelo.");

    return respuesta;

  } catch (error) {
    console.error("❌ Error al llamar a Gemini:", error.message);
    return "🤖 Lo siento, no pude generar una respuesta en este momento.";
  }
}

module.exports = { responderChat };
