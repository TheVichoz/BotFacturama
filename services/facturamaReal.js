const axios = require('axios');

async function generarFacturaReal(datosCliente) {
  const url = 'https://api.facturama.mx/3/cfdis';

  const auth = 'Basic ' + Buffer.from(
    process.env.FACTURAMA_USER + ':' + process.env.FACTURAMA_PASS
  ).toString('base64');

  // === Datos numéricos seguros ===
  const precioBase = parseFloat(datosCliente.precioBase || 0);
  const descuento = parseFloat(datosCliente.descuento || 0);
  const precioFinal = parseFloat(datosCliente.precioFinal || (precioBase - (precioBase * descuento / 100)));
  const iva = +(precioFinal * 0.16).toFixed(2);
  const totalConIva = +(precioFinal + iva).toFixed(2);

  // === Datos de producto con respaldo
  const producto = {
    ProductCode: datosCliente.productCode || '10111302',
    UnitCode: datosCliente.unitCode || 'H87',
    Unit: datosCliente.unit || 'Pieza',
    Description: datosCliente.descripcion || 'Producto genérico'
  };

  // === Construcción de factura ===
  const factura = {
    Receiver: {
      Name: datosCliente.razon,
      Rfc: datosCliente.rfc,
      CfdiUse: datosCliente.cfdi || 'G03',
      FiscalRegime: datosCliente.regimen || '601',
      TaxZipCode: datosCliente.cp
    },
    CfdiType: 'I',
    ExpeditionPlace: '37510',
    Currency: 'MXN',
    PaymentForm: datosCliente.formaPago || '01',
    PaymentMethod: datosCliente.metodoPago || 'PUE',
    Exportation: '01',
    Serie: datosCliente.Serie || null,
    Folio: datosCliente.Folio || null,
    Items: [
      {
        Quantity: 1,
        ProductCode: producto.ProductCode,
        UnitCode: producto.UnitCode,
        Unit: producto.Unit,
        Description: producto.Description,
        UnitPrice: precioFinal,
        Subtotal: precioFinal,
        TaxObject: '02',
        Taxes: [
          {
            Name: 'IVA',
            Rate: 0.16,
            Total: iva,
            Base: precioFinal,
            IsRetention: false,
            IsFederalTax: true
          }
        ],
        Total: totalConIva
      }
    ],
    Observations: datosCliente.comentarios || ''
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

    return {
      id: response.data.Id,
      folio: response.data.Folio,
      total: response.data.Total,
      subtotal: response.data.Subtotal,
      uuid: response.data.Complement?.TaxStamp?.Uuid || null,
      moneda: response.data.Currency,
      pdf: response.data.Links?.Pdf,
      xml: response.data.Links?.Xml
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
