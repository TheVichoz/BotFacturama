const { google } = require('googleapis');

const SPREADSHEET_ID = '1UyuY7Gl7yI5yXCr1yVCifkLvMgIOlg-tB9gVZb1_D0g';
const SHEET_NAME = 'Productos';

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

  console.log('📩 Primera línea escrita por el usuario:', JSON.stringify(primeraLinea));

  for (const row of rows) {
    const codigo = row[0] || '';        // Columna A: Código completo
    const nombre = row[1] || '';        // Columna B: Nombre
    const descripcion = row[2] || '';   // Columna C: Descripción
    const unidad = row[5] || '';        // Columna F (por ejemplo: "[E48] Unidad de servicio")
    const claveSAT = row[6] || '';      // Columna G
    const precioStr = row[7] || '';     // Columna H

    const codigoCorto = codigo.split('-')[1]?.trim()?.toLowerCase() || '';
    const primeraLineaLower = primeraLinea.toLowerCase();

    // Coincide con nombre completo o con código corto
    if (
      primeraLineaLower === nombre.toLowerCase() ||
      primeraLineaLower === descripcion.toLowerCase() ||
      primeraLineaLower === codigoCorto
    ) {
      const precio = parseFloat(precioStr.toString().replace('$', '').replace(',', '')) || 0;

      // Extraer el unitCode si hay corchetes
      const unitCodeMatch = unidad.match(/\[(.*?)\]/);
      // Extraer el texto después del corchete si existe
      const unitTextSplit = unidad.includes(']')
        ? unidad.split(']').pop()?.trim()
        : unidad.trim();

      console.log('✅ Producto válido encontrado:', nombre);
      console.log('🟢 unidad:', JSON.stringify(unidad));
      console.log('🟢 unitCode:', unitCodeMatch?.[1]);
      console.log('🟢 unit:', unitTextSplit);

      return {
        descripcion: nombre, // Concepto de factura
        productCode: claveSAT || '78181506',
        unitCode: unitCodeMatch?.[1] || 'H87',
        unit: unitTextSplit || 'Unidad de servicio',
        precioBase: precio
      };
    }
  }

  console.log('❌ Producto NO válido. No coincide con la lista exacta.');
  return null;
}

module.exports = { buscarProducto };
