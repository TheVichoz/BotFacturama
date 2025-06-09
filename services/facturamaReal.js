const axios = require('axios');

async function generarFacturaReal(datosCliente) {
  const url = 'https://api.facturama.mx/api-lite/3/cfdis';

  const auth = 'Basic ' + Buffer.from(
    process.env.FACTURAMA_USER + ':' + process.env.FACTURAMA_PASS
  ).toString('base64');

  const factura = {
    Issuer: {
      Rfc: 'CAGJ8111121RE8',                  // 🔐 Tu RFC emisor
      Name: 'JORGE CAMARENA GARCIA',         // 🧾 Nombre del emisor
      FiscalRegime: '612'                    // 🧾 Régimen correcto (Personas Físicas con Actividades Empresariales)
    },
    Receiver: {
      Name: datosCliente.razon,
      Rfc: datosCliente.rfc,
      CfdiUse: datosCliente.cfdi,
      FiscalRegime: datosCliente.regimen,     // Este debe venir bien en la hoja
      TaxZipCode: datosCliente.cp
    },
    CfdiType: 'I',
    ExpeditionPlace: '37510', // Tu código postal emisor (León, Gto)
    Currency: 'MXN',
    PaymentForm: datosCliente.formaPago,
    PaymentMethod: datosCliente.metodoPago,
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
    ],
    Observations: datosCliente.comentarios || ''
  };

  console.log('📤 Enviando factura (multiemisor)');
  console.log(JSON.stringify(datosCliente, null, 2));

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
    console.error(JSON.stringify(error?.response?.data || error.message, null, 2));
    throw new Error('Factura no generada correctamente.');
  }
}

module.exports = { generarFacturaReal };
