const axios = require('axios');

const FACTURAMA_API = 'https://apisandbox.facturama.mx';
const AUTH_HEADER = {
  Authorization: 'Basic ' + Buffer.from(
    process.env.FACTURAMA_USER + ':' + process.env.FACTURAMA_PASS
  ).toString('base64'),
  'Content-Type': 'application/json',
};

/**
 * 🔍 Buscar la última factura PPD emitida por RFC del receptor
 */
async function buscarFacturaPorRFC(rfc) {
  try {
    const res = await axios.get(`${FACTURAMA_API}/Cfdi?type=issued`, {
      headers: AUTH_HEADER,
    });

    const facturas = res.data || [];
    const facturasFiltradas = facturas.filter(
      (f) =>
        f.Rfc?.toUpperCase().trim() === rfc.toUpperCase().trim() &&
        f.PaymentMethod === 'PPD'
    );

    if (facturasFiltradas.length === 0) return null;

    const factura = facturasFiltradas[0];

    return {
      uuid: factura.Uuid || factura.FolioFiscal,
      total: parseFloat(factura.Total),
      subtotal: parseFloat(factura.Subtotal) || parseFloat(factura.Total) / 1.16,
      moneda: factura.Currency || 'MXN',
      folio: factura.Folio || '1',
      serie: factura.Serie || 'A',
      id: factura.Id
    };
  } catch (err) {
    console.error('❌ Error al buscar factura:', err.response?.data || err.message);
    return null;
  }
}

/**
 * 🧾 Generar complemento de pago (con datos del cliente ya obtenidos)
 */
async function generarComplementoPago(datosPago, receptor) {
  if (!receptor?.rfc || !receptor?.razon) {
    console.error('❌ Error: RFC o Nombre del receptor están vacíos.');
    return null;
  }

  const ivaTotal = parseFloat((datosPago.total - datosPago.subtotal).toFixed(2));

  const payload = {
    CfdiType: 'P',
    NameId: '14',
    ExpeditionPlace: '64103', // Verifica que esté registrado correctamente en Facturama
    Receiver: {
      Rfc: receptor.rfc,
      Name: receptor.razon,
      CfdiUse: 'CP01',
      FiscalRegime: receptor.regimen || '601',
      TaxZipCode: receptor.cp || '64000'
    },
    Complemento: {
      Payments: [
        {
          Date: datosPago.fechaPago,
          PaymentForm: datosPago.formaPago,
          Amount: parseFloat(datosPago.monto),
          RelatedDocuments: [
            {
              Uuid: datosPago.uuid,
              Serie: datosPago.serie || 'A',
              Folio: datosPago.folio || '1',
              Currency: datosPago.moneda || 'MXN',
              PaymentMethod: 'PPD',
              PartialityNumber: 1,
              PreviousBalanceAmount: parseFloat(datosPago.total),
              AmountPaid: parseFloat(datosPago.monto),
              ImpSaldoInsoluto: 0,
              TaxObject: '02',
              Taxes: [
                {
                  Name: 'IVA',
                  Rate: 0.16,
                  Total: ivaTotal,
                  Base: parseFloat(datosPago.subtotal),
                  IsRetention: false,
                },
              ],
            },
          ],
        },
      ],
    },
  };

  console.log('📦 JSON enviado a /3/cfdis:\n', JSON.stringify(payload, null, 2));

  try {
    const res = await axios.post(`${FACTURAMA_API}/3/cfdis`, payload, {
      headers: AUTH_HEADER,
    });

    console.log('✅ Complemento generado con éxito:', res.data.Id);
    return res.data;
  } catch (err) {
    console.error('❌ Error al generar complemento:', err.response?.data || err.message);
    return null;
  }
}

module.exports = {
  buscarFacturaPorRFC,
  generarComplementoPago
};
