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

  const range = `${SHEET_NAME}!A2:H`; // Incluye columnas relevantes
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });

  const rows = res.data.values;
  const textoUsuario = normalizarTexto(mensajeUsuario);

  for (const row of rows) {
    const nombre = row[1] || '';         // Columna B: Nombre
    const descripcion = row[2] || '';    // Columna C: Descripción
    const unidad = row[5] || '';         // Columna F: Unidad de medida
    const claveSAT = row[6] || '';       // Columna G: Producto/Servicio SAT
    const precioStr = (row[7] || '').toString().replace('$', '').replace(',', '').trim();
    const precio = parseFloat(precioStr) || 0;

    const nombreNormalizado = normalizarTexto(nombre);

    if (textoUsuario.includes(nombreNormalizado)) {
      return {
        Description: descripcion || nombre,
        ProductCode: claveSAT.replace(/\[|\]/g, ''),
        UnitCode: unidad.match(/\[(.*?)\]/)?.[1] || 'H87',
        Unit: unidad.split(']').pop()?.trim() || 'Pieza',
        precioBase: precio
      };
    }
  }

  return null; // Si no se encontró ningún producto
}

module.exports = { buscarProducto };
