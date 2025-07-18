const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const serverless = require('serverless-http');
const fs = require('fs');

const app = express();

app.use(cors());
app.use(express.json());

// 🔗 Rota para gerar Pix
app.post('/api/gerar-pix', async (req, res) => {
  const { nome, cpf, email, telefone } = req.body;

  if (!nome || !cpf || !email || !telefone) {
    return res.status(400).json({ error: "Dados incompletos" });
  }

  const pixPayload = {
    amount: 1000,
    currency: "BRL",
    paymentMethod: "pix",
    installments: 1,
    customer: {
      name: nome,
      email,
      document: { number: cpf, type: "cpf" },
      phone: telefone,
      externalRef: "pedido001",
      address: {
        street: "Rua Mirandopolis",
        streetNumber: "24",
        complement: "Casa",
        zipCode: "13308135",
        neighborhood: "Centro",
        city: "Itu",
        state: "SP",
        country: "BR"
      }
    },
    items: [
      {
        title: "Inscrição Concurso CNU",
        unitPrice: 1000,
        quantity: 1,
        tangible: false,
        externalRef: "inscricao2025"
      }
    ],
    pix: { expiresInDays: 1 },
    traceable: true,
    ip: "127.0.0.1"
  };

  try {
    const { data } = await axios.post("https://api-gateway.ativopay.com/api/user/transactions", pixPayload, {
      headers: {
        'x-api-key': '58406838-875b-4693-aca5-65d6a3510b58',
        'User-Agent': 'AtivoB2B/1.0',
        'Content-Type': 'application/json'
      }
    });

    const qrCode = data?.data?.pix?.qrcode;
    if (!qrCode) return res.status(500).json({ error: "QR Code ausente" });

    res.json({ qrcode: qrCode });
  } catch (err) {
    console.error("Erro ao gerar Pix:", err.response?.data || err.message);
    res.status(500).json({ error: "Erro ao gerar Pix" });
  }
});

// 🎯 Webhook para confirmação de pagamento
app.post('/api/webhook-pix', (req, res) => {
  console.log('📩 Webhook recebido:', req.body);

  const status = req.body.data?.status;
  const transactionId = req.body.objectId;

  if (status === 'paid') {
    console.log(`✅ Pagamento confirmado para transação ${transactionId}`);

    // Exemplo de salvar log localmente (durante testes locais)
    try {
      fs.writeFileSync('ultima_transacao.json', JSON.stringify(req.body, null, 2));
    } catch (error) {
      console.warn('Não foi possível salvar o log localmente (Vercel pode bloquear escrita).');
    }

    // Aqui você pode disparar conversão do Google Ads futuramente
  }

  res.sendStatus(200); // sempre retorne rápido
});

// 🧠 Export para Vercel
module.exports = app;
module.exports.handler = serverless(app);
