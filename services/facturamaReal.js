const axios = require('axios');

async function generarFacturaReal(datosCliente) {
  const url = 'https://apisandbox.facturama.mx/3/cfdis';
  const auth = 'Basic UHJ1ZWJhZGVhZ2VudGU6cHJ1ZWJhZGVhZ2VudGU=';

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
    PaymentForm: datosCliente.formaPago,         // ✅ DINÁMICO desde Excel
    PaymentMethod: datosCliente.metodoPago,      // ✅ DINÁMICO desde Excel
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

  console.log("📤 Enviando factura a Facturama:");
  console.log("→ RFC:", factura.Receiver.Rfc);
  console.log("→ Régimen:", factura.Receiver.FiscalRegime);
  console.log("→ CFDI:", factura.Receiver.CfdiUse);
  console.log("→ Método de pago:", factura.PaymentMethod);
  console.log("→ Forma de pago:", factura.PaymentForm);
  console.log("→ CP:", factura.Receiver.TaxZipCode);

  try {
    const response = await axios.post(url, factura, {
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json'
      }
    });

    const { Id, Folio, Links } = response.data;

    return {
      id: Id,
      folio: Folio,
      pdf: Links?.Pdf,
      xml: Links?.Xml
    };

  } catch (error) {
    console.error('❌ Error al emitir factura:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { generarFacturaReal };
