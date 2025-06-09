const axios = require('axios');

async function generarFacturaReal(datosCliente) {
  const url = 'https://api.facturama.mx/api-lite/2/cfdis'; // ✅ Producción

  const auth = 'Basic ' + Buffer.from(
    process.env.FACTURAMA_USER + ':' + process.env.FACTURAMA_PASS
  ).toString('base64');

  const factura = {
    Receiver: {
      Name: datosCliente.razon,
      Rfc: datosCliente.rfc,
      CfdiUse: datosCliente.cfdi,
      FiscalRegime: datosCliente.regimen,
      TaxZipCode: datosCliente.cp
    },
    CfdiType: 'I',
    ExpeditionPlace: '64103',
    Currency: 'MXN',
    PaymentForm: datosCliente.formaPago,
    PaymentMethod: datosCliente.metodoPago,
    Exportation: '01',
    Observations: datosCliente.comentarios || '',
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

  console.log("➡️ Enviando a:", url);
  console.log("📤 Headers:", auth.slice(0, 30) + '...'); // corta para no exponer todo
  console.log("📦 Datos:", JSON.stringify(factura, null, 2));

  try {
    const response = await axios.post(url, factura, {
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json'
      }
    });

    console.log('📦 RESPUESTA Facturama COMPLETA:');
    console.log(JSON.stringify(response.data, null, 2));

    if (!response.data || !response.data.Id) {
      console.error('❌ No se generó la factura. Respuesta incompleta o inválida.');
      throw new Error('Factura no generada correctamente.');
    }

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
      console.error('📥 Código:', error.response.status);
      console.error('📥 Datos:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    throw error;
  }
}

module.exports = { generarFacturaReal };
