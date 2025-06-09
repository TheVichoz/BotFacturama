// services/facturamaReal.js
const axios = require('axios');

async function generarFacturaReal(datosCliente) {
  const url = 'https://api.facturama.mx/3/cfdis'; // ✅ Endpoint correcto para API Web (no multiemisor)

  const auth = 'Basic ' + Buffer.from(
    process.env.FACTURAMA_USER + ':' + process.env.FACTURAMA_PASS
  ).toString('base64');

  const factura = {
    Receiver: {
      Name: datosCliente.razon,
      Rfc: datosCliente.rfc,
      CfdiUse: datosCliente.cfdi || 'G03',
      FiscalRegime: datosCliente.regimen || '601',
      TaxZipCode: datosCliente.cp
    },
    CfdiType: 'I',
    ExpeditionPlace: '64103', // Código postal del emisor
    Currency: 'MXN',
    PaymentForm: datosCliente.formaPago || '01',
    PaymentMethod: datosCliente.metodoPago || 'PUE',
    Exportation: '01',
    Items: [
      {
        Quantity: '1',
        ProductCode: '10111302',
        UnitCode: 'H87',
        Unit: 'Pieza',
        Description: datosCliente.comentarios || 'Producto demo emitido por el bot',
        UnitPrice: '100.00',
        Subtotal: '100.00',
        TaxObject: '02',
        Taxes: [
          {
            Name: 'IVA',
            Rate: '0.16',
            Total: '16.00',
            Base: '100.00',
            IsRetention: false,
            IsFederalTax: true
          }
        ],
        Total: '116.00'
      }
    ]
  };

  console.log('📤 Enviando factura en producción (API Web)');
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
      throw new Error('Factura no generada correctamente.');
    } else {
      console.error(error.message);
      throw error;
    }
  }
}

module.exports = { generarFacturaReal };
