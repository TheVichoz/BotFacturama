# 🤖 Chatbot de Facturación Automatizada por WhatsApp

Este proyecto implementa un chatbot que guía al usuario vía **WhatsApp** en el proceso de generación de una factura utilizando la **API de Facturama** en modo sandbox. El bot solicita los datos necesarios paso a paso y, al finalizar, genera una factura válida (en entorno de pruebas) y la envía por correo electrónico y WhatsApp.

---

## 🚀 Tecnologías utilizadas

| Tecnología     | Versión       |
|----------------|---------------|
| Node.js        | v22.13.1      |
| npm            | v10.9.2       |
| Express        | 5.1.0         |
| Twilio         | 5.6.1         |
| Axios          | 1.9.0         |
| Dotenv         | 16.5.0        |
| Nodemailer     | 7.0.3         |
| Body-parser    | 2.2.0         |

---

## 📂 Estructura del Proyecto

.
├── certificados/                # Archivos .cer y .key para el CSD (modo sandbox)
│   ├── CSD_EKU9003173C9.cer
│   ├── CSD_Sucursal_1_EKU.key
│   └── ...
├── node_modules/               # Módulos instalados por npm
├── services/                   # Lógica de negocio separada
│   ├── cargarCSD.js            # Lógica de carga los certificados del CSD
│   ├── facturama.js            # Lógica de facturación (Simulada)
│   ├── facturamaReal.js        # Generación real de factura (modo sandbox)
│   ├── mailer.js               # Envío de correos con PDF y XML
│   └── twilioSender.js         # Envío de mensajes por WhatsApp
├── .env                        # Variables de entorno (credenciales, puerto, etc.)
├── index.js                    # Webhook principal del bot
├── package.json                # Dependencias y metadatos del proyecto
├── package-lock.json           # Versión exacta de dependencias
├── test.js                     # Archivo de carga de certificados (Ejecutar)
└── README.md                   # Documentación del proyecto
---

## ✅ Flujo del Bot

1. El usuario escribe **"facturar"** por WhatsApp.
2. El bot solicita los siguientes datos:
   - RFC
   - Razón social
   - Código postal
   - Uso de CFDI
   - Correo electrónico
3. Cuando todos los datos son válidos:
   - Se genera una factura en **Facturama (modo sandbox)**.
   - Se envía por correo un PDF y XML (sandbox).
   - Se notifica al cliente por WhatsApp.

---

🌐 Entorno de ejecución local
Este bot(demo) está pensado para ejecutarse localmente con un webhook expuesto a Twilio mediante Ngrok.

*Clona el repositorio.

*Crea un archivo .env con las siguientes variables:
PORT=3000
FACTURAMA_AUTH=Autenticacion de facturama (token)
FACTURAMA_USER=Usuario facturama
FACTURAMA_PASS=Contraseña facturama
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=Correo emisor
MAIL_PASS=Contraseña de aplicacion gmail
TWILIO_ACCOUNT_SID=Twilio user ID
TWILIO_AUTH_TOKEN=Twilio Token
TWILIO_WHATSAPP_FROM=Twilio whatsapp

*Inicia el servidor:
node index.js

*Expón tu puerto con Ngrok:
ngrok http 3000

*Configura tu webhook en Twilio con la URL pública de Ngrok.

🔧 **Nota futura:**  
Este bot actualmente corre en modo local con Ngrok.  
En una versión productiva se desplegará en un servidor público y se usará un número oficial de WhatsApp Business para eliminar la necesidad de túneles locales.


📧 Contacto
Este bot fue desarrollado por Victor Hernandez como parte de un proyecto de automatización.
¿Dudas o comentarios? ¡Estoy disponible para ayudarte!
vicohdz.fraga@gmail.com
