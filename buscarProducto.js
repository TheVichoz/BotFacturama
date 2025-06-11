const { google } = require('googleapis');

const SPREADSHEET_ID = '1UyuY7Gl7yI5yXCr1yVCifkLvMgIOlg-tB9gVZb1_D0g';
const SHEET_NAME = 'Productos'; // Asegúrate que se llama así tal cual en la pestaña de Google Sheets

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

  // 👇 Los datos empiezan en la fila 3
  const range = `${SHEET_NAME}!A3:H`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });

  const rows = res.data.values || [];
  const textoUsuario = normalizarTexto(mensajeUsuario);

  // 🧪 Log para verificar que sí carga filas
  console.log('🧪 Filas cargadas de Productos:', rows.length);
  console.log('🧪 Primeras filas:', rows.slice(0, 2));

  // Solo continuar si el usuario escribió "parabrisas"
  if (!textoUsuario.includes('parabrisas')) {
    console.log('⚠️ El mensaje no contiene la palabra "parabrisas".');
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

    console.log('🔎 Comparando:', nombreNormalizado);

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

  console.log('❌ No se encontró el producto "Parabrisas" exactamente.');
  return null;
}

module.exports = { buscarProducto };
