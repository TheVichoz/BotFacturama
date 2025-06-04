const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

async function leerClientesDesdeSheets() {
  const credentialsPath = path.join(__dirname, 'sheets-credentials.json');

  if (!fs.existsSync(credentialsPath)) {
    console.error(`❌ Archivo de credenciales no encontrado en: ${credentialsPath}`);
    return;
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const spreadsheetId = '1UyuY7Gl7yI5yXCr1yVCifkLvMgIOlg-tB9gVZb1_D0g';
    const range = 'Clientes!A2:F'; // ya vi que tu hoja se llama "Clientes"

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
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
