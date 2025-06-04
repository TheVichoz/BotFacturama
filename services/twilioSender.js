// Importa el SDK oficial de Twilio
const twilio = require('twilio');

// Crea un cliente de Twilio usando las credenciales desde .env
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,   // SID de la cuenta Twilio
  process.env.TWILIO_AUTH_TOKEN     // Token de autenticación
);

// Función para enviar un mensaje de WhatsApp
async function enviarWhatsApp(to, mensaje) {
  try {
    // Envía el mensaje usando el número de WhatsApp configurado en Twilio Sandbox
    const result = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM, // Remitente (debe ser "whatsapp:+14155238886" en Sandbox)
      to,                                     // Número del cliente (ej. "whatsapp:+5218180000000")
      body: mensaje                           // Cuerpo del mensaje
    });

    // Si se envía correctamente, muestra el SID del mensaje en consola
    console.log('Mensaje extra enviado:', result.sid);
  } catch (err) {
    // Si ocurre un error, lo muestra en consola
    console.error('Error enviando mensaje extra:', err.message);
  }
}

// Exporta la función para poder usarla en otros archivos como index.js
module.exports = { enviarWhatsApp };
