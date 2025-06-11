const { google } = require('googleapis');

const SPREADSHEET_ID = '1UyuY7Gl7yI5yXCr1yVCifkLvMgIOlg-tB9gVZb1_D0g';
const SHEET_NAME = 'Productos';

function normalizarTexto(texto = '') {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
    .replace(/[^\w\s]/gi, '')        // Elimina signos de puntuación
    .trim()
    .toLowerCase();
}

async function buscarProducto(mensajeUsuario = '') {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const range = `${SHEET_NAME}!A2:H`; // Incluye columnas A–H
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });

  const rows = res.data.values;
  const palabrasClave = normalizarTexto(mensajeUsuario).split(/\s+/);

  for (const row of rows) {
    const nombre = row[1] || '';         // Columna B: Nombre del producto
    const descripcion = row[2] || '';    // Columna C: Descripción
    const unidad = row[5] || '';         // Columna F: Unidad de medida
    const claveSAT = row[6] || '';       // Columna G: Clave SAT
    const precio = parseFloat(row[7]?.replace('$', '').replace(',', '')) || 0; // Columna H: Precio

    const nombreNormalizado = normalizarTexto(nombre);

    const coincide = palabrasClave.every(palabra =>
      nombreNormalizado.includes(palabra)
    );

    if (coincide) {
      return {
        Description: descripcion || nombre,
        ProductCode: claveSAT.replace(/\[|\]/g, ''),
        UnitCode: unidad.match(/\[(.*?)\]/)?.[1] || 'H87',
        Unit: unidad.split(']').pop()?.trim() || 'Pieza',
        precioBase: precio
      };
    }
  }

  return null;
}

module.exports = { buscarProducto };
