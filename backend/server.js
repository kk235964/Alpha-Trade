// backend/server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

const { getBalance } = require('./coindcx');
// Utility to create HMAC SHA256 signature
const createSignature = (payload, secret) => {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
};


let API_KEY = '';
let API_SECRET = '';

app.post('/api/set-keys', (req, res) => {
  const { apiKey, apiSecret } = req.body;
  if (!apiKey || !apiSecret) {
    return res.status(400).json({ error: 'API key and secret required' });
  }
  console.log(API_KEY);

  API_KEY = apiKey;
  API_SECRET = apiSecret;
  res.json({ message: 'API credentials updated successfully' });
});

// Place Order Endpoint
// /api/order
app.post('/api/order', async (req, res) => {
    const { apiKey, apiSecret, symbol, side, quantity, price } = req.body;
  
    if (!apiKey || !apiSecret || !symbol || !side || !quantity || !price) {
      return res.status(400).json({ error: 'Missing parameters' });
    }
  
    const body = {
      order_type: 'limit_order',
      market: symbol,
      side: side,
      quantity: quantity.toString(),
      price_per_unit: price.toString(),
      timestamp: Date.now()
    };
  
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(JSON.stringify(body))
      .digest('hex');
  
    try {
      const result = await axios.post('https://api.coindcx.com/exchange/v1/orders/create', body, {
        headers: {
          'X-AUTH-APIKEY': apiKey,
          'X-AUTH-SIGNATURE': signature,
          'Content-Type': 'application/json'
        }
      });
  
      res.json(result.data);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Order failed';
      console.error('Order Error:', errorMsg);
  
      // Check for known KYC-related messages (this may vary based on the API)
      if (
        errorMsg.toLowerCase().includes('kyc') ||
        errorMsg.toLowerCase().includes('verification') ||
        errorMsg.toLowerCase().includes('not allowed')
      ) {
        return res.status(403).json({ error: 'KYC not verified. Please complete your KYC to place orders.' });
      }
  
      res.status(500).json({
        error: errorMsg
      });
    }
});
  
  


// /api/balance
app.post('/api/balance', async (req, res) => {
    const { apiKey, apiSecret } = req.body;
  
    if (!apiKey || !apiSecret) {
      return res.status(400).json({ error: 'Missing API credentials' });
    }
  
    const payload = {
      timestamp: Date.now()
    };
  
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
  
    try {
      const response = await axios.post('https://api.coindcx.com/exchange/v1/users/balances', payload, {
        headers: {
          'X-AUTH-APIKEY': apiKey,
          'X-AUTH-SIGNATURE': signature
        }
      });
  
      // Filter out coins with 0 balance
      const nonZero = response.data.filter(bal => parseFloat(bal.balance) >= 0);
      res.json(nonZero);
    } catch (err) {
      console.error(err.response?.data || err.message);
      res.status(401).json({ error: 'Failed to fetch balances' });
    }
  });
  
  

// Test Key Endpoint

app.post('/api/test-key', async (req, res) => {
  const { apiKey, apiSecret } = req.body;

  if (!apiKey || !apiSecret) {
    return res.status(400).json({ error: 'Missing API credentials' });
  }

  const payload = {
    timestamp: Date.now()
  };

  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(JSON.stringify(payload))
    .digest('hex');

  try {
    const response = await axios.post('https://api.coindcx.com/exchange/v1/users/info', payload, {
      headers: {
        'X-AUTH-APIKEY': apiKey,
        'X-AUTH-SIGNATURE': signature,
        'Content-Type': 'application/json'
      }
    });

    const user = response.data;

    // Check if KYC is verified
    if (user.kyc_status === 'verified') {
      return res.json({
        success: true,
        name: user.name || user.email || 'User',
        kyc: 'verified'
      });
    } else {
      return res.json({
        success: true,
        name: user.name || user.email || 'User',
        kyc: 'not_verified'
      });
    }

  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(401).json({ error: 'Invalid API key or secret' });
  }
});

  app.post('/api/orders', async (req, res) => {
    const { apiKey, apiSecret } = req.body;
  
    if (!apiKey || !apiSecret) {
      return res.status(400).json({ error: 'Missing API credentials' });
    }
  
    const body = {
      timestamp: Date.now()
    };
  
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(JSON.stringify(body))
      .digest('hex');
  
    try {
      const result = await axios.post('https://api.coindcx.com/exchange/v1/orders', body, {
        headers: {
          'X-AUTH-APIKEY': apiKey,
          'X-AUTH-SIGNATURE': signature,
          'Content-Type': 'application/json'
        }
      });
  
      res.json(result.data);
    } catch (err) {
      console.error(err.response?.data || err.message);
      res.status(500).json({
        error: err.response?.data?.message || 'Failed to fetch orders'
      });
    }
  });
  

app.listen(PORT, () => {
  console.log(`server running on http://localhost:${PORT}`);
});
