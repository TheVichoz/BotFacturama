const axios = require('axios');

async function generarFacturaReal(datosCliente) {
  const url = 'https://api.facturama.mx/3/cfdis';

  const auth = 'Basic ' + Buffer.from(
    process.env.FACTURAMA_USER + ':' + process.env.FACTURAMA_PASS
  ).toString('base64');

  // === Datos numéricos seguros ===
  const precioBase = parseFloat(datosCliente.precioBase || 0);
  const descuento = parseFloat(datosCliente.descuento || 0);
  const precioFinal = parseFloat(
    datosCliente.precioFinal || (precioBase - (precioBase * descuento / 100))
  );
  const iva = +(precioFinal * 0.16).toFixed(2);
  const totalConIva = +(precioFinal + iva).toFixed(2);

  // === Mapeo de nombre de serie a código real en Facturama ===
  const serieMap = {
    GLOBAL: 'A',
    HONDA: 'B',
    MARAVILLAS: 'C',
    MSERV: 'D',
    SERVICIO: 'E'
  };

  const serieNombre = datosCliente.Serie?.toUpperCase().trim();
  const serieFinal = serieMap[serieNombre] || serieNombre;

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
    Serie: serieFinal,
    Folio: datosCliente.Folio || null,
    Items: datosCliente.productos.map((prod) => {
      const cantidad = Number(prod.cantidad || 1);
      const precioBaseProducto = Number(prod.precioBase || 0);
      const descuentoProducto = Number(datosCliente.descuento || 0);

      const precioConDescuento = +(
        precioBaseProducto -
        (precioBaseProducto * descuentoProducto / 100)
      ).toFixed(2);

      const subtotal = +(precioConDescuento * cantidad).toFixed(2);
      const iva = +(subtotal * 0.16).toFixed(2);
      const totalConIva = +(subtotal + iva).toFixed(2);

      let productCodeFinal = prod.productCode || datosCliente.productCode || '10111302';

      if ((prod.unitCode || datosCliente.unitCode || '').toUpperCase() === 'E48') {
        productCodeFinal = '78181506';
      }

      return {
        Quantity: cantidad,
        ProductCode: productCodeFinal,
        UnitCode: prod.unitCode || datosCliente.unitCode || 'E48',
        Unit: prod.unit || datosCliente.unit || 'Unidad de servicio',
        Description: prod.descripcion,
        UnitPrice: precioConDescuento,
        Subtotal: subtotal,
        TaxObject: '02',
        Taxes: [
          {
            Name: 'IVA',
            Rate: 0.16,
            Total: iva,
            Base: subtotal,
            IsRetention: false,
            IsFederalTax: true
          }
        ],
        Total: totalConIva
      };
    }),
    Observations: datosCliente.comentarios || ''
  };

  // === Logs de depuración antes de enviar ===
  console.log('================ FACTURAMA DEBUG ================');
  console.log('🧾 Cliente:', datosCliente.razon, datosCliente.rfc);
  console.log('🧾 Régimen:', datosCliente.regimen);
  console.log('🧾 CP fiscal:', datosCliente.cp);
  console.log('🧾 Método/Forma:', factura.PaymentMethod, factura.PaymentForm);
  console.log('🧾 Serie y Folio:', factura.Serie, factura.Folio);
  console.log('🧾 Concepto principal:', factura.Items[0]?.Description);
  console.log('🧾 ProductCode:', factura.Items[0]?.ProductCode);
  console.log('🧾 UnitCode:', factura.Items[0]?.UnitCode);
  console.log('🧾 Unit:', factura.Items[0]?.Unit);
  console.log('📤 Payload completo a Facturama:\n', JSON.stringify(factura, null, 2));
  console.log('=================================================');

  try {
    const response = await axios.post(url, factura, {
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json'
      },
      timeout: 30000,
      validateStatus: () => true
    });

    console.log('================ RESPUESTA FACTURAMA ================');
    console.log('📡 Status:', response.status);
    console.log('📦 Data:\n', JSON.stringify(response.data, null, 2));
    console.log('📋 Headers:\n', JSON.stringify(response.headers, null, 2));
    console.log('=====================================================');

    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `Facturama rechazó la factura. Status: ${response.status}. Data: ${JSON.stringify(response.data)}`
      );
    }

    if (!response.data?.Id) {
      throw new Error(
        `Factura no generada correctamente. Respuesta sin Id: ${JSON.stringify(response.data)}`
      );
    }

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
    console.error('================ ERROR FACTURAMA ================');
    console.error('❌ Message:', error?.message);
    console.error('❌ Code:', error?.code);

    if (error.response) {
      console.error('❌ Status:', error.response.status);
      console.error('❌ Response Data:\n', JSON.stringify(error.response.data, null, 2));
      console.error('❌ Response Headers:\n', JSON.stringify(error.response.headers, null, 2));
    }

    console.error(
      '❌ Error completo:\n',
      JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    );

    console.error('=================================================');

    throw new Error(error?.message || 'Factura no generada correctamente.');
  }
}

module.exports = { generarFacturaReal };