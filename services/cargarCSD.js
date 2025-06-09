// Importa los módulos necesarios
const fs = require('fs'); // Módulo para leer archivos del sistema
const axios = require('axios'); // Cliente HTTP para hacer peticiones
require('dotenv').config(); // Carga variables de entorno desde .env

// Función principal para cargar el CSD (Certificado de Sello Digital)
async function cargarCSD() {
  // Endpoint de Facturama para cargar certificados en modo sandbox
  const url = 'https://api.facturama.mx';

  // Token de autenticación desde variables de entorno (.env)
  const auth = process.env.FACTURAMA_AUTH;

  // Lee el archivo .cer y lo convierte a base64
  const certificate = fs.readFileSync('./certificados/CSD_Sucursal_1_EKU9003173C9_20230517_223850.cer').toString('base64');

  // Lee la clave privada .key y también la convierte a base64
  const privateKey = fs.readFileSync('./certificados/CSD_Sucursal_1_EKU9003173C9_20230517_223850.key').toString('base64');

  // Datos requeridos por la API de Facturama
  const data = {
    Rfc: 'EKU9003173C9',              // RFC de prueba
    Certificate: certificate,         // Certificado codificado en base64
    PrivateKey: privateKey,           // Clave privada en base64
    PrivateKeyPassword: '12345678a'   // Contraseña del .key (default en sandbox)
  };

  try {
    // Envío de la solicitud POST con los datos y encabezados
    const response = await axios.post(url, data, {
      headers: {
        Authorization: auth,              // Autenticación con token
        'Content-Type': 'application/json'
      }
    });

    // Si todo va bien, muestra la respuesta de Facturama
    console.log('✅ CSD cargado correctamente:', response.data);
  } catch (error) {
    // Si hay un error, muestra el mensaje correspondiente
    console.error('❌ Error al cargar CSD:', error.response?.data || error.message);
  }
}

// Exporta la función para que pueda ser llamada desde otro archivo
module.exports = { cargarCSD };
