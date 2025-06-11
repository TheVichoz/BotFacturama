const { google } = require('googleapis');

const SPREADSHEET_ID = '1UyuY7Gl7yI5yXCr1yVCifkLvMgIOlg-tB9gVZb1_D0g';
const SHEET_NAME = 'Productos'; // Asegúrate que la pestaña se llama así, sin espacios

function normalizarTexto(texto = '') {
  return texto
    .normalize("NFD")                       // separa acentos
    .replace(/[\u0300-\u036f]/g, '')       // elimina acentos
    .replace(/[^\w\s]/gi, '')              // elimina signos
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

  const range = `${SHEET_NAME}!A3:H`; // los datos empiezan en fila 3
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });

  const rows = res.data.values || [];

  console.log('🧪 Filas cargadas de Productos:', rows.length);
  console.log('🧪 Primeras filas:', rows.slice(0, 2));

  // 🧠 Solo considerar la primera línea del mensaje
  const primeraLinea = mensajeUsuario.split('\n')[0] || '';
  const primeraLineaNormalizada = normalizarTexto(primeraLinea);

  if (primeraLineaNormalizada !== 'parabrisas') {
    console.log('⚠️ La primera línea no es exactamente "parabrisas":', primeraLineaNormalizada);
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
        Description: descripcion || nombre,
        ProductCode: claveSAT.replace(/\[|\]/g, ''),
        UnitCode: unidad.match(/\[(.*?)\]/)?.[1] || 'H87',
        Unit: unidad.split(']').pop()?.trim() || 'Pieza',
        precioBase: precio
      };
    }
  }

  console.log('❌ No se encontró el producto con nombre exactamente "Parabrisas".');
  return null;
}

module.exports = { buscarProducto };
