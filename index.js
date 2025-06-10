require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { enviarCorreo } = require('./services/mailer');
const { generarFacturaReal } = require('./services/facturamaReal');
const { buscarFacturasPorRFC, generarComplementoPago } = require('./facturamaComplemento');
const { responderChat } = require('./services/chatModel');
const { analizarMensaje } = require('./analizarMensaje');
const { buscarCliente } = require('./buscarCliente');
const { probarTokenFacturama } = require('./services/probarTokenFacturama');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

global.ESTADO_COMPLEMENTO = {};
global.ULTIMO_INTENTO = null;

console.log('🧪 Usuario Facturama:', process.env.FACTURAMA_USER);
probarTokenFacturama();

process.on('uncaughtException', err => {
  console.error('❌ Error no capturado:', err);
});

app.get('/', (req, res) => {
  res.send('✅ Bot de WhatsApp activo');
});

app.post('/webhook', async (req, res) => {
  const from = req.body.From;
  const message = req.body.Body?.trim();

  console.log('📩 Mensaje recibido de', from, '→', message);

  const responder = (mensaje) => {
    res.set('Content-Type', 'text/xml');
    res.send(`<Response><Message>${mensaje}</Message></Response>`);
  };

  // === COMPLEMENTO DE PAGO ===
  if (message.toLowerCase().startsWith('complemento')) {
    const partes = message.split(' ');
    const rfc = partes[1]?.trim();

    if (!rfc) return responder('⚠️ Escribe *complemento* seguido del RFC. Ejemplo:\ncomplemento ROHA651106MI4');

    const facturas = await buscarFacturasPorRFC(rfc);
    if (!facturas?.length) return responder('❌ No se encontró ninguna factura emitida a ese RFC.');

    global.ESTADO_COMPLEMENTO[from] = { rfc, facturas };

    const lista = facturas.map((f, i) => `*${i + 1}*. Folio: ${f.folio} - $${f.total} - ${f.metodo}`).join('\n');
    return responder(`📑 Se encontraron las siguientes facturas:\n\n${lista}\n\nEscribe el número de la factura que deseas usar.`);
  }

  if (global.ESTADO_COMPLEMENTO[from] && !global.ESTADO_COMPLEMENTO[from].facturaSeleccionada) {
    const seleccion = parseInt(message);
    const estado = global.ESTADO_COMPLEMENTO[from];

    if (isNaN(seleccion) || seleccion < 1 || seleccion > estado.facturas.length) {
      return responder('⚠️ Por favor, elige un número válido de la lista anterior.');
    }

    estado.facturaSeleccionada = estado.facturas[seleccion - 1];
    return responder('📅 Ahora dime la fecha y forma de pago separadas por espacio. Ejemplo:\n2025-06-01 03');
  }

  if (global.ESTADO_COMPLEMENTO[from]?.facturaSeleccionada) {
    const estado = global.ESTADO_COMPLEMENTO[from];
    const [fecha, formaPago] = message.split(' ');

    if (!fecha || !formaPago) {
      return responder('⚠️ Formato incorrecto. Ejemplo:\n2025-06-01 03');
    }

    const cliente = await buscarCliente(estado.rfc);
    if (!cliente?.correo) {
      delete global.ESTADO_COMPLEMENTO[from];
      return responder('⚠️ No se encontró el correo del cliente en la hoja.');
    }

    const datosPago = {
      rfc: cliente.rfc,
      nombre: cliente.razon,
      fechaPago: `${fecha}T00:00:00`,
      formaPago,
      monto: estado.facturaSeleccionada.total,
      total: estado.facturaSeleccionada.total,
      subtotal: estado.facturaSeleccionada.subtotal,
      moneda: estado.facturaSeleccionada.moneda,
      uuid: estado.facturaSeleccionada.uuid,
      id: estado.facturaSeleccionada.id,
      folio: estado.facturaSeleccionada.folio,
      serie: estado.facturaSeleccionada.serie
    };

    const complemento = await generarComplementoPago(datosPago, cliente);
    delete global.ESTADO_COMPLEMENTO[from];

    if (!complemento?.Id) {
      return responder('❌ Error al generar el complemento de pago.');
    }

    await enviarCorreo(cliente.correo, {
      ...datosPago,
      tipo: 'complemento',
      folio: complemento.Folio,
      id: complemento.Id,
      correo: cliente.correo
    });

    return responder(`✅ Complemento generado para *${datosPago.rfc}*.\n📧 Enviado a *${cliente.correo}*.`);
  }

  // === FACTURACIÓN ===
  const afirmacion = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, '');
  if (afirmacion === 'si' && global.ULTIMO_INTENTO) {
    const datos = global.ULTIMO_INTENTO;
    responder('📧 Procesando tu factura...');

    (async () => {
      try {
        const factura = await generarFacturaReal({ ...datos });

        await enviarCorreo(datos.correo, {
          ...datos,
          tipo: 'factura',
          folio: factura.Folio || factura.folio || '',
          id: factura.Id || factura.id || '',
          factura
        });

        global.ULTIMO_INTENTO = null;
      } catch (error) {
        console.error('❌ Error al generar factura:', JSON.stringify(error?.response?.data || error.message, null, 2));
      }
    })();

    return;
  }

  if (message.toLowerCase() === 'facturar') {
    return responder(`📄 Para generar tu factura, escribe los datos que tengas disponibles.\n\nEjemplo:\n*URVAN BLANCA\nP/GRX425F\nS/K9033313\nO/7134581\nFACTURA A NISSAN CENTRO MAX*`);
  }

  if (message.toLowerCase().includes("factura a")) {
    const datos = analizarMensaje(message);
    const cliente = await buscarCliente(datos.cliente || '');

    if (!cliente) return responder('⚠️ El cliente no está registrado o no tiene un correo válido.');

    const mensajeLower = message.toLowerCase();
    if (mensajeLower.includes('pue')) {
      cliente.metodoPago = 'PUE';
      cliente.formaPago = '03';
    } else if (mensajeLower.includes('ppd')) {
      cliente.metodoPago = 'PPD';
      cliente.formaPago = '99';
    } else if (cliente.metodoPago === 'PPD') {
      cliente.formaPago = '99';
    }

    global.ULTIMO_INTENTO = {
      rfc: cliente.rfc,
      razon: cliente.razon,
      cp: cliente.cp,
      cfdi: cliente.cfdi,
      correo: cliente.correo,
      regimen: cliente.regimen,
      metodoPago: cliente.metodoPago,
      formaPago: cliente.formaPago,
      comentarios: `Vehículo: ${datos.vehiculo} / Placa: ${datos.placa} / Serie: ${datos.serie} / Orden: ${datos.orden}`
    };

    return responder(
      `🧾 ¿Confirmas generar la factura con los siguientes datos?\n\n` +
      `🔹 Cliente: ${cliente.razon}\n` +
      `🔹 RFC: ${cliente.rfc}\n` +
      `🔹 Régimen: ${cliente.regimen}\n` +
      `🔹 Método de pago: ${cliente.metodoPago}\n` +
      `🔹 Forma de pago: ${cliente.formaPago}\n` +
      `🔹 CP: ${cliente.cp}\n` +
      `🔹 CFDI: ${cliente.cfdi}\n` +
      `🔹 Comentarios: ${global.ULTIMO_INTENTO.comentarios}\n\n` +
      `Responde con *Sí* para emitir la factura.`
    );
  }

  // === CHAT GENERAL ===
  try {
    const respuestaAI = await responderChat(message);
    const mensajeFijo = "💬 Si deseas una factura, escribe *facturar*. Para complemento, escribe *complemento {RFC}*.";
    return responder(`🤖 ${respuestaAI}\n\n${mensajeFijo}`);
  } catch (error) {
    console.error("🧠 Error al generar respuesta AI:", error);
    return responder("🤖 Lo siento, no pude generar una respuesta en este momento.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot activo en http://localhost:${PORT}`);
});
