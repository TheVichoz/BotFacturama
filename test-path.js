const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'sheets-credentials.json');

console.log('Ruta esperada:', filePath);

if (fs.existsSync(filePath)) {
  console.log('✅ El archivo SÍ existe.');
} else {
  console.log('❌ El archivo NO se encuentra.');
}
