// Importa la función cargarCSD desde el archivo correspondiente en /services
const { cargarCSD } = require('./services/cargarCSD');

// Ejecuta la función para cargar el Certificado de Sello Digital (CSD)
// Esto sube el certificado y la clave a Facturama en modo sandbox
cargarCSD();
