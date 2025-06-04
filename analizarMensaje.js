const { buscarFacturaPorRFC, generarComplementoPago } = require('./facturamaComplemento');

// 🧠 Estado global de conversaciones para complemento
if (!global.ESTADO_COMPLEMENTO) global.ESTADO_COMPLEMENTO = {};
const estadosComplemento = global.ESTADO_COMPLEMENTO;

/**
 * 🧾 Análisis de mensaje con datos para facturar (modo tradicional)
 */
function analizarMensaje(texto) {
  const lineas = texto
    .split('\n')
    .map(l => l.trim())
    .filter(l => l !== '');

  let datos = {
    consecutivo: null,
    servicio: null,
    vehiculo: null,
    placa: null,
    serie: null,
    orden: null,
    cliente: null
  };

  for (let linea of lineas) {
    if (/^\d+$/.test(linea)) datos.consecutivo = linea;
    else if (linea.startsWith('D/')) datos.servicio = linea;
    else if (linea.startsWith('P/')) datos.placa = linea.replace('P/', '');
    else if (linea.startsWith('S/')) datos.serie = linea.replace('S/', '');
    else if (linea.startsWith('O/')) datos.orden = linea.replace('O/', '');
    else if (linea.toUpperCase().startsWith('FACTURA A')) {
      datos.cliente = linea.replace(/FACTURA A/i, '').trim();
    } else if (!datos.vehiculo) {
      datos.vehiculo = linea;
    }
  }

  return datos;
}

/**
 * 💬 Flujo conversacional paso a paso para generar complemento de pago
 */
async function analizarFlujoConversacional(mensaje, from) {
  const texto = mensaje.trim().toLowerCase();

  if (texto === 'complemento') {
    estadosComplemento[from] = { paso: 1 };
    return '🔁 Estás en modo complemento. Por favor, proporciona el RFC del cliente para buscar la factura.';
  }

  if (estadosComplemento[from]) {
    const estado = estadosComplemento[from];

    if (estado.paso === 1) {
      estado.rfc = texto.toUpperCase();
      const factura = await buscarFacturaPorRFC(estado.rfc);

      if (!factura) {
        delete estadosComplemento[from];
        return '❌ No se encontró una factura con ese RFC. Escribe "complemento" para intentarlo de nuevo.';
      }

      estado.uuid = factura.uuid;
      estado.total = factura.total;
      estado.nombre = factura.receptor.Name || 'Cliente';
      estado.paso = 2;

      return `✅ Factura encontrada para *${estado.nombre}*. Total: $${estado.total}\nAhora dime el *monto pagado*.`;
    }

    if (estado.paso === 2) {
      const monto = parseFloat(texto.replace('$', '').trim());
      if (isNaN(monto)) return '❌ Por favor, ingresa un monto válido (ej. 1800).';
      estado.monto = monto;
      estado.paso = 3;
      return '📅 ¿Cuál fue la fecha del pago? (usa formato YYYY-MM-DD o escribe "hoy")';
    }

    if (estado.paso === 3) {
      const hoy = new Date().toISOString().split('T')[0];
      estado.fechaPago = texto === 'hoy' ? hoy : texto;
      estado.paso = 4;
      return '💳 Por último, dime la forma de pago (código SAT, por ejemplo: 03 para transferencia).';
    }

    if (estado.paso === 4) {
      estado.formaPago = texto;

      const resultado = await generarComplementoPago(estado);
      delete estadosComplemento[from];

      if (resultado) {
        return '✅ Complemento de pago generado correctamente.';
      } else {
        return '❌ Ocurrió un error al generar el complemento. Intenta más tarde.';
      }
    }
  }

  return '👋 Escribe *facturar* para generar una factura o *complemento* para agregar un pago.';
}

module.exports = {
  analizarMensaje,
  analizarFlujoConversacional
};
