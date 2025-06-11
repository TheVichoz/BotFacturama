const { google } = require('googleapis');

const SPREADSHEET_ID = '1UyuY7Gl7yI5yXCr1yVCifkLvMgIOlg-tB9gVZb1_D0g';
const SHEET_NAME = 'Productos';

function normalizarTexto(texto = '') {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, '') // elimina acentos
    .replace(/[^\w\s]/gi, '')        // elimina puntuación
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

  const range = `${SHEET_NAME}!A3:H`; // ⬅️ ¡Aquí el cambio!
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });

  const rows = res.data.values;
  const textoUsuario = normalizarTexto(mensajeUsuario);

  // Detectar palabra clave
  let palabraClave = null;
  if (textoUsuario.includes('parabrisas')) {
    palabraClave = 'parabrisas';
  } else if (textoUsuario.includes('quemacocos')) {
    palabraClave = 'quemacocos';
  }

  if (!palabraClave) return null;

  for (const row of rows) {
    const nombre = row[1] || '';          // Columna B
    const descripcion = row[2] || '';     // Columna C
    const unidad = row[5] || '';          // Columna F
    const claveSAT = row[6] || '';        // Columna G
    const precioStr = row[7] || '';       // Columna H

    const nombreNormalizado = normalizarTexto(nombre);
    const precio = parseFloat(precioStr.toString().replace('$', '').replace(',', '')) || 0;

    // Mostrar en consola qué está comparando
    console.log('Comparando:', nombreNormalizado, 'con', palabraClave);

    if (nombreNormalizado.includes(palabraClave)) {
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
