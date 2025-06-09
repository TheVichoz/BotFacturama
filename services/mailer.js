const nodemailer = require('nodemailer');
const axios = require('axios');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

async function enviarCorreo(destinatario, datos) {
  const adjuntos = [];
  const baseUrl = 'https://api.facturama.mx';

  try {
    // ⚠️ TODOS los documentos de API Web se descargan como "issued"
    const tipo = 'issued';
    const id = datos.factura?.id || datos.id;

    // Descargar PDF
    const pdfRes = await axios.get(`${baseUrl}/cfdi/pdf/${tipo}/${id}`, {
      headers: {
        Authorization: process.env.FACTURAMA_AUTH
      }
    });

    adjuntos.push({
      filename: `Comprobante_${datos.folio || 'sin_folio'}.pdf`,
      content: Buffer.from(pdfRes.data.Content, 'base64'),
      contentType: 'application/pdf'
    });

    // Descargar XML
    const xmlRes = await axios.get(`${baseUrl}/cfdi/xml/${tipo}/${id}`, {
      headers: {
        Authorization: process.env.FACTURAMA_AUTH
      }
    });

    adjuntos.push({
      filename: `Comprobante_${datos.folio || 'sin_folio'}.xml`,
      content: Buffer.from(xmlRes.data.Content, 'base64'),
      contentType: 'application/xml'
    });

  } catch (error) {
    console.error('❌ Error al descargar archivos:', error.message);
  }

  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto;">
      <h2 style="color: #007bff;">📄 ${datos.tipo === 'complemento' ? 'Complemento de Pago' : 'Factura generada'} exitosamente</h2>
      <p>Hola <strong>${datos.razon || datos.nombre}</strong>,</p>
      <p>Adjuntamos los archivos digitales correspondientes a tu ${datos.tipo === 'complemento' ? 'complemento de pago' : 'factura'} (PDF y XML), válidos para fines contables.</p>

      <ul>
        <li><strong>RFC:</strong> ${datos.rfc}</li>
        <li><strong>Folio:</strong> ${datos.folio || 'No disponible'}</li>
        ${datos.cfdi ? `<li><strong>Uso de CFDI:</strong> ${datos.cfdi}</li>` : ''}
        ${datos.cp ? `<li><strong>Código postal:</strong> ${datos.cp}</li>` : ''}
        <li><strong>Correo registrado:</strong> ${datos.correo}</li>
      </ul>

      <p>Guarda estos archivos para tu consulta o uso posterior.</p>

      <hr style="margin: 30px 0;">
      <p style="font-size: 0.85em; color: #666;">
        ⚠️ <strong>Aviso:</strong> Este mensaje ha sido generado como parte de un sistema de prueba.
        Los datos mostrados no tienen validez fiscal y han sido generados en un entorno sandbox.
      </p>

      <p style="font-size: 0.9em;">Saludos cordiales,<br><strong>Equipo de Facturación</strong></p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Bot Facturación" <${process.env.MAIL_USER}>`,
    to: destinatario,
    subject: `📄 Confirmación de ${datos.tipo === 'complemento' ? 'Complemento de Pago' : 'Factura'}`,
    html,
    attachments: adjuntos
  });

  console.log(`📧 Correo enviado a ${destinatario} con ${adjuntos.length} adjunto(s) ✅`);
}

module.exports = { enviarCorreo };
