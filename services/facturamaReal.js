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

  // === Mapeo de nombre de serie a código real en Facturama
  const serieMap = {
    'GLOBAL': 'A',
    'HONDA': 'B',
    'MARAVILLAS': 'C',
    'MSERV': 'D',
    'SERVICIO': 'E'
  };
  const serieNombre = datosCliente.Serie?.toUpperCase().trim();
  const serieFinal = serieMap[serieNombre] || serieNombre;

  // === Si es unidad de servicio, ProductCode = 78181506
  let productCodeFinal = datosCliente.productCode || '10111302';
  if ((datosCliente.unitCode || '').toUpperCase() === 'E48') {
    productCodeFinal = '78181506';
  }

  // === Construcción de factura
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
    Serie: serieFinal,
    Folio: datosCliente.Folio || null,
    Items: datosCliente.productos.map(prod => {
  const precioConDescuento = +(prod.precioBase - (prod.precioBase * datosCliente.descuento / 100)).toFixed(2);
  const iva = +(precioConDescuento * prod.cantidad * 0.16).toFixed(2);
  const totalConIva = +(precioConDescuento * prod.cantidad + iva).toFixed(2);

  return {
    Quantity: prod.cantidad,
    ProductCode: prod.productCode,
    UnitCode: prod.unitCode,
    Unit: prod.unit,
    Description: prod.descripcion,
    UnitPrice: precioConDescuento,
    Subtotal: +(precioConDescuento * prod.cantidad).toFixed(2),
    TaxObject: '02',
    Taxes: [
      {
        Name: 'IVA',
        Rate: 0.16,
        Total: iva,
        Base: +(precioConDescuento * prod.cantidad).toFixed(2),
        IsRetention: false,
        IsFederalTax: true
      }
    ],
    Total: totalConIva
  };
}),

    Observations: datosCliente.comentarios || ''
  };

  // === Logs de depuración ===
  console.log('🧾 Concepto que se enviará:', factura.Items[0].Description);
  console.log('🧾 ProductCode que se enviará:', factura.Items[0].ProductCode);
  console.log('🧾 UnitCode que se enviará:', factura.Items[0].UnitCode);
  console.log('🧾 Unit que se enviará:', factura.Items[0].Unit);
  console.log('🧾 Serie y Folio que se enviarán a Facturama:', factura.Serie, factura.Folio);
  console.log('📤 Payload completo a Facturama:\n', JSON.stringify(factura, null, 2));

  try {
    const response = await axios.post(url, factura, {
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json'
      }
    });

    console.log('📦 RESPUESTA Facturama:\n', JSON.stringify(response.data, null, 2));

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
    console.error('❌ Error al emitir factura:\n');
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
