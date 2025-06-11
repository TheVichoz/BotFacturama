const { google } = require('googleapis');

const SPREADSHEET_ID = '1UyuY7Gl7yI5yXCr1yVCifkLvMgIOlg-tB9gVZb1_D0g';
const SHEET_NAME = 'Productos';

async function buscarProducto(nombreProducto = '') {
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
    const nombre = row[0]?.trim();           // Nombre del producto
    const precio = parseFloat(row[1]) || 0;  // Precio base

    if (!nombreProducto || nombre.toLowerCase() === nombreProducto.toLowerCase()) {
      return {
        descripcion: nombre,
        precioBase: precio
      };
    }
  }

  throw new Error('❌ Producto no encontrado en la hoja de Productos');
}

module.exports = { buscarProducto };
