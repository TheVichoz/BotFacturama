const { google } = require('googleapis');

const SPREADSHEET_ID = '1UyuY7Gl7yI5yXCr1yVCifkLvMgIOlg-tB9gVZb1_D0g';
const SHEET_NAME = 'Productos';

function normalizarTexto(texto = '') {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, '') // elimina acentos
    .replace(/[^\w\s]/gi, '')       // elimina signos de puntuación
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

  const range = `${SHEET_NAME}!A2:H`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });

  const rows = res.data.values;
  const textoUsuario = normalizarTexto(mensajeUsuario);

  // Solo permitir productos válidos: "parabrisas" o "quemacocos"
  let palabraClave = null;
  if (textoUsuario.includes('parabrisas')) {
    palabraClave = 'parabrisas';
  } else if (textoUsuario.includes('quemacocos')) {
    palabraClave = 'quemacocos';
  }

  if (!palabraClave) {
    return null; // mensaje no contiene palabra válida
  }

  for (const row of rows) {
    const nombre = row[1] || '';         // Columna B: Nombre
    const descripcion = row[2] || '';    // Columna C: Descripción
    const unidad = row[5] || '';         // Columna F: Unidad de medida
    const claveSAT = row[6] || '';       // Columna G: Clave SAT
    const precioStr = row[7] || '';      // Columna H: Precio

    const nombreNormalizado = normalizarTexto(nombre);
    const precio = parseFloat(precioStr.toString().replace('$', '').replace(',', '')) || 0;

    // Comparar nombre exacto normalizado
    if (nombreNormalizado === palabraClave) {
      return {
        Description: descripcion || nombre,
        ProductCode: claveSAT.replace(/\[|\]/g, ''),
        UnitCode: unidad.match(/\[(.*?)\]/)?.[1] || 'H87',
        Unit: unidad.split(']').pop()?.trim() || 'Pieza',
        precioBase: precio
      };
    }
  }

  return null; // No se encontró coincidencia exacta
}

module.exports = { buscarProducto };
