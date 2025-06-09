const axios = require('axios');

async function probarTokenFacturama() {
  const url = 'https://api.facturama.mx/api-lite/2/cfdis'; // Producción

  const auth = 'Basic ' + Buffer.from(
    process.env.FACTURAMA_USER + ':' + process.env.FACTURAMA_PASS
  ).toString('base64');

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json'
      }
    });

    console.log("✅ TOKEN válido. Facturas encontradas:");
    console.log(response.data);

  } catch (error) {
    console.error("❌ TOKEN inválido o sin permisos:");
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

module.exports = { probarTokenFacturama };
