const { google } = require('googleapis');

const SPREADSHEET_ID = '1UyuY7Gl7yI5yXCr1yVCifkLvMgIOlg-tB9gVZb1_D0g';
const SHEET_NAME = 'Productos';

function normalizarTexto(texto = '') {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
    .replace(/[^\w\s]/gi, '')        // Elimina signos
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

  const range = `${SHEET_NAME}!A3:H`; // Los datos empiezan en la fila 3
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });

  const rows = res.data.values || [];

  console.log('🧪 Filas cargadas de Productos:', rows.length);
  console.log('🧪 Primeras filas:', rows.slice(0, 2));

  const primeraLinea = mensajeUsuario
    .split('\n')
    .map(l => l.trim())
    .find(l => l.length > 0) || '';

  const primeraLineaNormalizada = normalizarTexto(primeraLinea);

  console.log('📩 Primera línea cruda:', JSON.stringify(primeraLinea));
  console.log('📩 Primera línea normalizada:', primeraLineaNormalizada);

  if (primeraLineaNormalizada !== 'parabrisas') {
    console.log('⚠️ La primera línea no es exactamente "parabrisas"');
    return null;
  }

  for (const row of rows) {
    const nombre = row[1] || '';        // Columna B: Nombre
    const descripcion = row[2] || '';   // Columna C: Descripción
    const unidad = row[5] || '';        // Columna F
    const claveSAT = row[6] || '';      // Columna G
    const precioStr = row[7] || '';     // Columna H

    const nombreNormalizado = normalizarTexto(nombre);
    const precio = parseFloat(precioStr.toString().replace('$', '').replace(',', '')) || 0;

    console.log('🔎 Comparando producto en hoja:', nombreNormalizado);

    if (nombreNormalizado === 'parabrisas') {
      console.log('✅ Producto encontrado:', nombre);

      return {
        descripcion: descripcion || nombre,
        productCode: claveSAT.replace(/\[|\]/g, ''),
        unitCode: unidad.match(/\[(.*?)\]/)?.[1] || 'H87',
        unit: unidad.split(']').pop()?.trim() || 'Pieza',
        precioBase: precio
      };
    }
  }

  console.log('❌ No se encontró el producto con nombre exactamente "Parabrisas".');
  return null;
}

module.exports = { buscarProducto };
