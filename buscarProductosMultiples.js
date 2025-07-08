const { google } = require('googleapis');

const SPREADSHEET_ID = '1UyuY7Gl7yI5yXCr1yVCifkLvMgIOlg-tB9gVZb1_D0g';
const SHEET_NAME = 'Productos';

async function buscarProductosMultiples(mensajeUsuario = '') {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const range = `${SHEET_NAME}!A3:H`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });

  const rows = res.data.values || [];

  const lineas = mensajeUsuario
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const productosEncontrados = [];

  for (const linea of lineas) {
    const lineaLower = linea.toLowerCase();

    for (const row of rows) {
      const codigo = row[0] || '';
      const nombre = row[1] || '';
      const descripcion = row[2] || '';
      const unidad = row[5] || '';
      const claveSAT = row[6] || '';
      const precioStr = row[7] || '';

      const codigoCorto = codigo.split('-')[1]?.trim()?.toLowerCase() || '';

      if (
        lineaLower === nombre.toLowerCase() ||
        lineaLower === descripcion.toLowerCase() ||
        lineaLower === codigoCorto
      ) {
        const precio = parseFloat(precioStr.toString().replace('$', '').replace(',', '')) || 0;
        const unitCodeMatch = unidad.match(/\[(.*?)\]/);
        const unitTextSplit = unidad.includes(']')
          ? unidad.split(']').pop()?.trim()
          : unidad.trim();

        productosEncontrados.push({
          descripcion: nombre,
          productCode: claveSAT || '78181506',
          unitCode: unitCodeMatch?.[1] || 'H87',
          unit: unitTextSplit || 'Unidad de servicio',
          precioBase: precio
        });

        break;
      }
    }
  }

  return productosEncontrados;
}

module.exports = { buscarProductosMultiples };
