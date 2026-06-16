const axios = require('axios');

function maskValue(value, visibleStart = 3, visibleEnd = 3) {
  if (value === undefined || value === null) return value;
  const str = String(value);

  if (str.length <= visibleStart + visibleEnd) {
    return '*'.repeat(str.length);
  }

  return (
    str.slice(0, visibleStart) +
    '*'.repeat(str.length - visibleStart - visibleEnd) +
    str.slice(-visibleEnd)
  );
}

function showCharCodes(value) {
  if (value === undefined || value === null) return null;

  return String(value)
    .split('')
    .map((char) => `${char}:${char.charCodeAt(0)}`)
    .join(' | ');
}

function cleanEnv(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

async function probarAuthFacturama(auth, urlBase) {
  try {
    console.log('================ PRUEBA AUTH FACTURAMA ================');
    console.log('🔎 Probando endpoint GET:', `${urlBase}/cfdis`);

    const response = await axios.get(`${urlBase}/cfdis`, {
      headers: {
        Authorization: auth,
        Accept: 'application/json'
      },
      timeout: 30000,
      validateStatus: () => true
    });

    console.log('📡 Auth test status:', response.status);
    console.log('📦 Auth test data:', JSON.stringify(response.data, null, 2));
    console.log('📋 Auth test headers:', JSON.stringify(response.headers, null, 2));

    if (response.status === 401) {
      console.log('❌ AUTH TEST: Falló autenticación. Credenciales/API no aceptadas desde este entorno.');
    } else if (response.status === 405) {
      console.log('✅ AUTH TEST: Autenticó bien. El 405 es normal porque /cfdis espera POST.');
    } else {
      console.log('ℹ️ AUTH TEST: No fue 401. La API respondió, revisar status/data.');
    }

    console.log('========================================================');
  } catch (error) {
    console.error('================ ERROR AUTH TEST FACTURAMA ================');
    console.error('❌ Message:', error?.message);
    console.error('❌ Code:', error?.code);
    console.error('===========================================================');
  }
}

async function generarFacturaReal(datosCliente) {
  const urlBase = 'https://api.facturama.mx/3';
  const url = `${urlBase}/cfdis`;

  const rawUser = process.env.FACTURAMA_USER;
  const rawPass = process.env.FACTURAMA_PASS;

  const facturamaUser = cleanEnv(rawUser);
  const facturamaPass = cleanEnv(rawPass);

  const authRaw = `${facturamaUser}:${facturamaPass}`;
  const auth = 'Basic ' + Buffer.from(authRaw).toString('base64');

  // === Logs de entorno / autenticación ===
  console.log('================ FACTURAMA ENV DEBUG ================');
  console.log('🌎 NODE_ENV:', process.env.NODE_ENV);
  console.log('🌎 URL:', url);

  console.log('🔐 FACTURAMA_USER existe:', rawUser !== undefined);
  console.log('🔐 FACTURAMA_PASS existe:', rawPass !== undefined);

  console.log('🔐 USER raw JSON:', JSON.stringify(rawUser));
  console.log('🔐 USER limpio JSON:', JSON.stringify(facturamaUser));
  console.log('🔐 USER length raw:', rawUser ? String(rawUser).length : 0);
  console.log('🔐 USER length limpio:', facturamaUser.length);
  console.log('🔐 USER char codes raw:', showCharCodes(rawUser));

  console.log('🔐 PASS raw masked:', maskValue(rawPass));
  console.log('🔐 PASS limpio masked:', maskValue(facturamaPass));
  console.log('🔐 PASS length raw:', rawPass ? String(rawPass).length : 0);
  console.log('🔐 PASS length limpio:', facturamaPass.length);
  console.log('🔐 PASS starts limpio:', facturamaPass.slice(0, 3));
  console.log('🔐 PASS ends limpio:', facturamaPass.slice(-3));
  console.log('🔐 PASS char codes raw:', showCharCodes(rawPass));

  console.log('🔐 AUTH RAW masked:', `${maskValue(facturamaUser)}:${maskValue(facturamaPass)}`);
  console.log('🔐 AUTH base64 preview:', auth.slice(0, 35) + '...');
  console.log('🔐 AUTH base64 length:', auth.length);

  if (!facturamaUser || !facturamaPass) {
    throw new Error('Faltan variables FACTURAMA_USER o FACTURAMA_PASS en el entorno.');
  }

  if (rawUser !== facturamaUser) {
    console.warn('⚠️ FACTURAMA_USER tenía espacios/saltos. Se limpió con trim().');
  }

  if (rawPass !== facturamaPass) {
    console.warn('⚠️ FACTURAMA_PASS tenía espacios/saltos. Se limpió con trim().');
  }

  console.log('=====================================================');

  // Prueba rápida de auth antes de intentar timbrar.
  // Si esta prueba da 405, la auth está bien.
  // Si da 401, Render/entorno/credenciales están mal.
  await probarAuthFacturama(auth, urlBase);

  // === Datos numéricos seguros ===
  const precioBase = parseFloat(datosCliente.precioBase || 0);
  const descuento = parseFloat(datosCliente.descuento || 0);
  const precioFinal = parseFloat(
    datosCliente.precioFinal || (precioBase - (precioBase * descuento / 100))
  );
  const ivaGeneral = +(precioFinal * 0.16).toFixed(2);
  const totalConIvaGeneral = +(precioFinal + ivaGeneral).toFixed(2);

  console.log('================ FACTURAMA CALCULOS DEBUG ================');
  console.log('💰 precioBase:', precioBase);
  console.log('💰 descuento:', descuento);
  console.log('💰 precioFinal:', precioFinal);
  console.log('💰 ivaGeneral:', ivaGeneral);
  console.log('💰 totalConIvaGeneral:', totalConIvaGeneral);
  console.log('==========================================================');

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

  if (!Array.isArray(datosCliente.productos) || datosCliente.productos.length === 0) {
    throw new Error('No hay productos para facturar.');
  }

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
    Items: datosCliente.productos.map((prod, index) => {
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

      console.log(`================ ITEM ${index + 1} DEBUG ================`);
      console.log('📦 descripcion:', prod.descripcion);
      console.log('📦 cantidad:', cantidad);
      console.log('📦 precioBaseProducto:', precioBaseProducto);
      console.log('📦 descuentoProducto:', descuentoProducto);
      console.log('📦 precioConDescuento:', precioConDescuento);
      console.log('📦 subtotal:', subtotal);
      console.log('📦 iva:', iva);
      console.log('📦 totalConIva:', totalConIva);
      console.log('📦 productCodeFinal:', productCodeFinal);
      console.log('📦 unitCode:', prod.unitCode || datosCliente.unitCode || 'E48');
      console.log('=========================================================');

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
  console.log('================ FACTURAMA PAYLOAD DEBUG ================');
  console.log('🧾 Cliente:', datosCliente.razon, datosCliente.rfc);
  console.log('🧾 Régimen:', datosCliente.regimen);
  console.log('🧾 CP fiscal:', datosCliente.cp);
  console.log('🧾 Método/Forma:', factura.PaymentMethod, factura.PaymentForm);
  console.log('🧾 Serie original:', datosCliente.Serie);
  console.log('🧾 Serie final:', factura.Serie);
  console.log('🧾 Folio:', factura.Folio);
  console.log('🧾 Concepto principal:', factura.Items[0]?.Description);
  console.log('🧾 ProductCode:', factura.Items[0]?.ProductCode);
  console.log('🧾 UnitCode:', factura.Items[0]?.UnitCode);
  console.log('🧾 Unit:', factura.Items[0]?.Unit);
  console.log('🧾 Items count:', factura.Items.length);
  console.log('📤 Payload completo a Facturama:\n', JSON.stringify(factura, null, 2));
  console.log('========================================================');

  try {
    console.log('================ ENVIANDO A FACTURAMA ================');
    console.log('🚀 POST:', url);
    console.log('🚀 Timeout: 30000ms');
    console.log('🚀 Headers enviados:', JSON.stringify({
      Authorization: auth.slice(0, 35) + '...',
      'Content-Type': 'application/json'
    }, null, 2));
    console.log('======================================================');

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

    if (response.status === 401) {
      console.error('❌ 401 Unauthorized: Facturama no aceptó el Authorization desde este entorno.');
      console.error('❌ Si en CMD da 405 y aquí da 401, el problema está en Render/env vars o en cómo se desplegó.');
    }

    if (response.status === 400) {
      console.error('❌ 400 Bad Request: Auth sí pasó, pero Facturama rechazó datos del CFDI.');
    }

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

    console.log('================ FACTURA GENERADA OK ================');
    console.log('✅ Id:', response.data.Id);
    console.log('✅ Folio:', response.data.Folio);
    console.log('✅ Total:', response.data.Total);
    console.log('✅ UUID:', response.data.Complement?.TaxStamp?.Uuid || null);
    console.log('====================================================');

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
    console.error('❌ Name:', error?.name);

    if (error.response) {
      console.error('❌ Status:', error.response.status);
      console.error('❌ Response Data:\n', JSON.stringify(error.response.data, null, 2));
      console.error('❌ Response Headers:\n', JSON.stringify(error.response.headers, null, 2));
    }

    if (error.request && !error.response) {
      console.error('❌ Hubo request pero no hubo respuesta de Facturama.');
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