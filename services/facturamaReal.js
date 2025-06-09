const axios = require('axios');

async function generarFacturaReal(datosCliente) {
  const url = 'https://api.facturama.mx/api-lite/3/cfdis'; // ✅ Multiemisor producción

  const auth = 'Basic ' + Buffer.from(
    process.env.FACTURAMA_USER + ':' + process.env.FACTURAMA_PASS
  ).toString('base64');

  const factura = {
    Receiver: {
      Name: datosCliente.razon,
      Rfc: datosCliente.rfc,
      CfdiUse: 'G03',              // 🔧 Fijo como en sandbox
      FiscalRegime: '601',         // 🔧 Fijo como en sandbox
      TaxZipCode: datosCliente.cp
    },
    CfdiType: 'I',
    ExpeditionPlace: '64103',
    Currency: 'MXN',
    PaymentForm: '01',             // 🔧 Efectivo
    PaymentMethod: 'PUE',          // 🔧 Pago en una sola exhibición
    Exportation: '01',
    Items: [
      {
        Quantity: '1',
        ProductCode: '10111302',
        UnitCode: 'H87',
        Unit: 'Pieza',
        Description: 'Producto demo emitido por el bot',
        UnitPrice: '100.00',
        Subtotal: '100.00',
        TaxObject: '02',
        Taxes: [
          {
            Name: 'IVA',
            Rate: '0.16',
            Total: '16.00',
            Base: '100.00',
            IsRetention: 'false',
            IsFederalTax: 'true'
          }
        ],
        Total: '116.00'
      }
    ]
  };

  console.log("📤 Enviando factura (multiemisor)");
  console.log(JSON.stringify(factura, null, 2));

  try {
    const response = await axios.post(url, factura, {
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json'
      }
    });

    console.log('📦 RESPUESTA Facturama:');
    console.log(JSON.stringify(response.data, null, 2));

    const { Id, Folio, Links } = response.data;

    return {
      id: Id,
      folio: Folio,
      pdf: Links?.Pdf,
      xml: Links?.Xml
    };

  } catch (error) {
    console.error('❌ Error al emitir factura:');
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    throw new Error("Factura no generada correctamente.");
  }
}

module.exports = { generarFacturaReal };
