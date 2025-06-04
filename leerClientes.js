const { google } = require('googleapis');

const SPREADSHEET_ID = '1UyuY7Gl7yI5yXCr1yVCifkLvMgIOlg-tB9gVZb1_D0g';
const SHEET_NAME = 'Clientes';

async function leerClientesDesdeSheets() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const range = `${SHEET_NAME}!A2:F`;

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    });

    const rows = res.data.values;

    if (rows.length) {
      const clientes = {};
      rows.forEach(([nombre, rfc, razon, cp, cfdi, correo]) => {
        if (!nombre) return;
        clientes[nombre.trim()] = {
          rfc: rfc?.trim() || '',
          razon: razon?.trim() || '',
          cp: cp?.trim() || '',
          cfdi: cfdi?.trim() || '',
          correo: correo?.trim() || ''
        };
      });

      console.log('✅ Clientes cargados desde Google Sheets:\n');
      console.log(clientes);
      return clientes;
    } else {
      console.log('❌ No se encontraron datos en la hoja.');
    }
  } catch (err) {
    console.error('❌ Error al acceder a Google Sheets:', err.message || err);
  }
}

if (require.main === module) {
  leerClientesDesdeSheets();
}

module.exports = { leerClientesDesdeSheets };
