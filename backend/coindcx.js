const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.COINDCX_API_KEY;
const API_SECRET = process.env.COINDCX_SECRET;
const BASE_URL = 'https://api.coindcx.com';

function generateSignature(payload) {
  return crypto
    .createHmac('sha256', API_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
}

async function getBalance() {
  const payload = {
    timestamp: Date.now()
  };
  const signature = generateSignature(payload);
  
  const res = await axios.post(`${BASE_URL}/exchange/v1/users/balances`, payload, {
    headers: {
      'X-AUTH-APIKEY': API_KEY,
      'X-AUTH-SIGNATURE': signature
    }
  });
  
  return res.data;
}

module.exports = { getBalance };
