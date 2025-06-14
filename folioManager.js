const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = 'Folios';

async function obtenerYActualizarFolio(serieSolicitada = 'GLOBAL') {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  console.log('📋 Usando SPREADSHEET_ID:', SPREADSHEET_ID);
  console.log('🔍 Buscando serie:', serieSolicitada);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:B`,
  });

  const rows = res.data.values || [];
  let rowIndex = -1;
  let ultimoFolio = 0;

  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0].toUpperCase().trim() === serieSolicitada.toUpperCase().trim()) {
      rowIndex = i + 2;
      ultimoFolio = parseInt(rows[i][1] || '0');
      break;
    }
  }

  if (rowIndex === -1) {
    console.log('❌ Series disponibles:', rows.map(r => r[0]));
    throw new Error(`Serie "${serieSolicitada}" no encontrada en Google Sheets.`);
  }

  const nuevoFolio = ultimoFolio + 1;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!B${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[nuevoFolio]]
    }
  });

  return nuevoFolio;
}

module.exports = { obtenerYActualizarFolio };
