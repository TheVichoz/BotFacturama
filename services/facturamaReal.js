const axios = require('axios');

const FACTURAMA_API = 'https://api.facturama.mx/api-lite/3/cfdis';
const AUTH_HEADER = {
  Authorization: 'Basic ' + Buffer.from(
    process.env.FACTURAMA_USER + ':' + process.env.FACTURAMA_PASS
  ).toString('base64'),
  'Content-Type': 'application/json',
};

async function generarFacturaReal(datosCliente) {
  console.log('📤 Enviando factura (multiemisor)');
  console.log(JSON.stringify(datosCliente, null, 2));

  const data = {
    Folio: "001",
    Issuer: {
      Rfc: process.env.FACTURAMA_USER,
      Name: "Proteq Facturas",
      FiscalRegime: "612"
    },
    Receiver: {
      Name: datosCliente.razon,
      Rfc: datosCliente.rfc,
      CfdiUse: datosCliente.cfdi,
      FiscalRegime: datosCliente.regimen,
      TaxZipCode: datosCliente.cp
    },
    CfdiType: "I",
    ExpeditionPlace: "64103",
    Currency: "MXN",
    PaymentForm: datosCliente.formaPago,
    PaymentMethod: datosCliente.metodoPago,
    Exportation: "01",
    Items: [
      {
        Quantity: "1",
        ProductCode: "10111302",
        UnitCode: "H87",
        Unit: "Servicio",
        Description: datosCliente.comentarios || "Servicio prestado",
        UnitPrice: "100.00",
        Subtotal: "100.00",
        TaxObject: "02",
        Taxes: [
          {
            Name: "IVA",
            Rate: "0.16",
            Total: "16.00",
            Base: "100.00",
            IsRetention: false,
            IsFederalTax: true
          }
        ],
        Total: "116.00"
      }
    ]
  };

  try {
    const res = await axios.post(FACTURAMA_API, data, { headers: AUTH_HEADER });

    if (res.data && res.data.Id) {
      console.log('✅ Factura generada:', res.data.Id);
      return res.data;
    } else {
      console.error('❌ No se generó la factura. Respuesta incompleta.');
      throw new Error("Factura no generada correctamente.");
    }
  } catch (error) {
    const mensaje = error.response?.data || error.message;
    console.error('❌ Error al emitir factura:', JSON.stringify(mensaje, null, 2));
    throw new Error("Factura no generada correctamente.");
  }
}

module.exports = { generarFacturaReal };
