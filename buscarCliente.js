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

async function buscarCliente(nombreOBuscado) {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const range = `${SHEET_NAME}!A2:Z`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });

  const rows = res.data.values;

  for (const row of rows) {
    const nombre = row[0]?.trim();
    const rfc = row[1]?.trim();
    const regimenTexto = row[2]?.trim();
    const formaPagoTexto = row[4]?.trim();
    const metodoPago = row[5]?.trim();
    const usoCfdiTexto = row[6]?.trim();
    const correos = (row[8] || '').toString().trim();
    const cp = row[17]?.trim();

    const buscado = nombreOBuscado?.trim().toUpperCase();
    const nombreActual = nombre?.toUpperCase();
    const rfcActual = rfc?.toUpperCase();

    const correosValidos = correos
      .split(',')
      .map(c => c.trim())
      .filter(c => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c));

    if ((buscado === nombreActual || buscado === rfcActual) && correosValidos.length > 0) {
      const codigoPostal = (cp && cp.length === 5) ? cp : '00000';

      const regimenFinal = rfc.length === 13
        ? '621'
        : regimenFiscalMap[normalizarTexto(regimenTexto)] || '601';

      const formaPago = formaPagoMap[normalizarTexto(formaPagoTexto)] || '99';
      const cfdi = usoCFDIMap[normalizarTexto(usoCfdiTexto)] || 'G03';

      // Log completo para depuración
      console.log("📋 Datos cargados desde Google Sheets:");
      console.log({
        rfc,
        razon: nombre,
        cp: codigoPostal,
        cfdi,
        correo: correosValidos.join(','),
        regimen: regimenFinal,
        metodoPago: metodoPago || 'PUE',
        formaPago
      });

      return {
        rfc,
        razon: nombre,
        cp: codigoPostal,
        cfdi,
        correo: correosValidos.join(','),
        regimen: regimenFinal,
        metodoPago: metodoPago || 'PUE',
        formaPago
      };
    }
  }

  return null;
}

module.exports = { buscarCliente };
