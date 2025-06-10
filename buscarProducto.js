const { google } = require('googleapis');

const SPREADSHEET_ID = '1UyuY7Gl7yI5yXCr1yVCifkLvMgIOlg-tB9gVZb1_D0g'; // tu ID de hoja
const SHEET_NAME = 'Productos';

function normalizarTexto(texto) {
  return texto?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

async function buscarProducto(nombreBuscado) {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const range = `${SHEET_NAME}!A2:H`; // A = Código, B = Nombre, ..., H = Precio
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });

  const filas = res.data.values || [];
  const nombreNormalizado = normalizarTexto(nombreBuscado);

  for (const fila of filas) {
    const nombreProducto = normalizarTexto(fila[1]); // Columna B: Nombre
    if (nombreProducto && nombreNormalizado.includes(nombreProducto)) {
      return {
        ProductCode: fila[0]?.trim() || '',          // Columna A
        Description: fila[2]?.trim() || '',           // Columna C
        UnitCode: (fila[5]?.match(/\[(.*?)\]/) || [])[1] || 'H87', // extrae H87 de "[H87] Pieza"
        Unit: fila[5]?.split(']')[1]?.trim() || 'Pieza',           // extrae "Pieza"
        PrecioCatalogo: parseFloat(fila[7]) || 0      // Columna H
      };
    }
  }

  return null;
}

module.exports = { buscarProducto };
