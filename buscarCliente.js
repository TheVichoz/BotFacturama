const { google } = require('googleapis');

const SPREADSHEET_ID = '1UyuY7Gl7yI5yXCr1yVCifkLvMgIOlg-tB9gVZb1_D0g';
const SHEET_NAME = 'Clientes';

function normalizarTexto(texto) {
  return texto?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

const usoCFDIMap = {
  "gastos en general": "G03",
  "adquisicion de mercancias": "G01",
  "adquisición de mercancías": "G01",
  "por definir": "P01"
};

const regimenFiscalMap = {
  "regimen simplificado de confianza": "621",
  "general de ley personas morales": "601",
  "personas fisicas con actividades empresariales y profesionales": "612",
  "incorporacion fiscal": "621",
  "sueldos y salarios e ingresos asimilados a salarios": "605",
  "": "601"
};

const formaPagoMap = {
  "efectivo": "01",
  "cheque nominativo": "02",
  "transferencia electronica de fondos": "03",
  "transferencia electrónica de fondos": "03",
  "tarjeta de crédito": "04",
  "tarjeta de credito": "04",
  "tarjeta de debito": "28",
  "monedero electronico": "05",
  "por definir": "99"
};

async function buscarCliente(nombreComercialBuscado) {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  // Leer encabezados para encontrar la columna "Descuento"
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1:Z1`,
  });

  const headers = headerRes.data.values[0];
  const descuentoIndex = headers.findIndex(h =>
    normalizarTexto(h).includes("descuento")
  );

  // Leer todas las filas de datos
  const range = `${SHEET_NAME}!A2:Z`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });

  const rows = res.data.values;

  const buscado = nombreComercialBuscado?.trim().toUpperCase();
  console.log('🔍 Buscando nombre comercial:', buscado);

  for (const row of rows) {
    const nombreComercial = row[0]?.trim();    // Columna A
    const razonSocial = row[1]?.trim();        // Columna B
    const rfc = row[2]?.trim();                // Columna C
    const regimenTexto = row[3]?.trim();       // Columna D
    const formaPagoTexto = row[5]?.trim();     // Columna F
    const metodoPago = row[6]?.trim();         // Columna G
    const usoCfdiTexto = row[7]?.trim();       // Columna H
    const correos = (row[8] || '').toString().trim(); // Columna I
    const cp = row[17]?.trim();                // Columna R
    const descuentoStr = row[descuentoIndex] || '0';
    const descuento = parseFloat(descuentoStr) || 0;

    const nombreComercialActual = nombreComercial?.toUpperCase();
    console.log(`🔎 Comparando: "${buscado}" con "${nombreComercialActual}"`);

    const correosValidos = correos
      .split(',')
      .map(c => c.trim())
      .filter(c => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c));

    if (buscado === nombreComercialActual && correosValidos.length > 0) {
      const codigoPostal = (cp && cp.length === 5) ? cp : '00000';

      const regimenFinal = rfc.length === 13
        ? '621'
        : regimenFiscalMap[normalizarTexto(regimenTexto)] || '601';

      const formaPago = formaPagoMap[normalizarTexto(formaPagoTexto)] || '99';
      const cfdi = usoCFDIMap[normalizarTexto(usoCfdiTexto)] || 'G03';

      console.log("📋 Cliente encontrado (por nombre comercial):");
      console.log({
        rfc,
        razon: razonSocial,
        cp: codigoPostal,
        cfdi,
        correo: correosValidos.join(','),
        regimen: regimenFinal,
        metodoPago: metodoPago || 'PUE',
        formaPago,
        descuento
      });

      return {
        rfc,
        razon: razonSocial,
        cp: codigoPostal,
        cfdi,
        correo: correosValidos.join(','),
        regimen: regimenFinal,
        metodoPago: metodoPago || 'PUE',
        formaPago,
        descuento
      };
    }
  }

  console.log('❌ Cliente no encontrado o sin correo válido.');
  return null;
}

module.exports = { buscarCliente };
