require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { enviarCorreo } = require('./services/mailer');
const { generarFacturaReal } = require('./services/facturamaReal');
const { buscarFacturaPorRFC, generarComplementoPago } = require('./facturamaComplemento');
const { responderChat } = require('./services/chatModel');
const { analizarMensaje } = require('./analizarMensaje');
const { buscarCliente } = require('./buscarCliente');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

global.ESTADO_COMPLEMENTO = {};
global.ULTIMO_INTENTO = null;

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

  // Paso 1: RFC para complemento
  if (message.toLowerCase().startsWith('complemento')) {
    const partes = message.split(' ');
    const rfc = partes[1]?.trim();

    if (!rfc) {
      return responder('⚠️ Escribe *complemento* seguido del RFC. Ejemplo:\ncomplemento ROHA651106MI4');
    }

    global.ESTADO_COMPLEMENTO[from] = { rfc };
    return responder('📅 Por favor, dime la fecha y forma de pago separadas por espacio. Ejemplo:\n2025-06-01 03');
  }

  // Paso 2: Fecha y forma de pago
  if (global.ESTADO_COMPLEMENTO[from]) {
    const estado = global.ESTADO_COMPLEMENTO[from];
    const [fecha, formaPago] = message.split(' ');

    if (!fecha || !formaPago) {
      return responder('⚠️ Formato incorrecto. Ejemplo:\n2025-06-01 03');
    }

    const factura = await buscarFacturaPorRFC(estado.rfc);
    if (!factura) {
      delete global.ESTADO_COMPLEMENTO[from];
      return responder('❌ No se encontró ninguna factura PPD emitida a ese RFC.');
    }

    const cliente = await buscarCliente(estado.rfc);
    if (!cliente || !cliente.correo) {
      delete global.ESTADO_COMPLEMENTO[from];
      return responder('⚠️ No se encontró el correo del cliente en la hoja.');
    }

    const datosPago = {
      rfc: cliente.rfc,
      nombre: cliente.razon,
      fechaPago: `${fecha}T00:00:00`,
      formaPago,
      monto: factura.total,
      total: factura.total,
      subtotal: factura.subtotal,
      moneda: factura.moneda,
      uuid: factura.uuid,
      id: factura.id,
      folio: factura.folio,
      serie: factura.serie
    };

    const complemento = await generarComplementoPago(datosPago, cliente);
    delete global.ESTADO_COMPLEMENTO[from];

    if (!complemento || !complemento.Id) {
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

  // Confirmación de factura (sí / si / SI / etc.)
  const afirmacion = message.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, '');
  if (afirmacion === 'si' && global.ULTIMO_INTENTO) {
    const datos = global.ULTIMO_INTENTO;
    responder('📧 Procesando tu factura...');

    (async () => {
      try {
        const factura = await generarFacturaReal({ ...datos, comentarios: datos.comentarios });
        await enviarCorreo(datos.correo, { ...datos, factura, tipo: 'factura' });
        global.ULTIMO_INTENTO = null;
      } catch (error) {
        console.error('❌ Error al generar factura:', error.message);
      }
    })();

    return;
  }

  // Instrucción para generar factura
  if (message.toLowerCase() === 'facturar') {
    return responder(
      `📄 Para generar tu factura, escribe los datos que tengas disponibles.\n\n` +
      `Ejemplo:\n*URVAN BLANCA\\nP/GRX425F\\nS/K9033313\\nO/7134581\\nFACTURA A NISSAN CENTRO MAX*`
    );
  }

  // Análisis de datos para facturación
  if (message.toLowerCase().includes("factura a")) {
    const datos = analizarMensaje(message);
    const cliente = await buscarCliente(datos.cliente || '');

    if (!cliente) {
      return responder('⚠️ El cliente no está registrado o no tiene un correo válido.');
    }

    // Detectar si el mensaje pide explícitamente PUE o PPD
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

  // Respuesta tipo chatbot
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
