const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();

// All exchange endpoints
const EXCHANGES = {
  binance: 'https://fapi.binance.com',
  okx: 'https://www.okx.com',
  bybit: 'https://api.bybit.com',
  gateio: 'https://api.gateio.ws'
};

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Multi-Exchange Crypto Proxy',
    status: 'running',
    region: process.env.RENDER_REGION || 'unknown',
    exchanges: {
      binance: `${req.protocol}://${req.get('host')}/binance`,
      okx: `${req.protocol}://${req.get('host')}/okx`,
      bybit: `${req.protocol}://${req.get('host')}/bybit`,
      gateio: `${req.protocol}://${req.get('host')}/gateio`
    },
    examples: {
      binance: `${req.protocol}://${req.get('host')}/binance/fapi/v1/time`,
      okx: `${req.protocol}://${req.get('host')}/okx/api/v5/public/time`,
      bybit: `${req.protocol}://${req.get('host')}/bybit/v5/market/time`,
      gateio: `${req.protocol}://${req.get('host')}/gateio/api/v4/spot/time`
    },
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    uptime: process.uptime(),
    region: process.env.RENDER_REGION || 'unknown'
  });
});

// BINANCE routes
app.all('/binance/*', async (req, res) => {
  await proxyRequest(req, res, 'binance', 'https://fapi.binance.com');
});

// OKX routes
app.all('/okx/*', async (req, res) => {
  await proxyRequest(req, res, 'okx', 'https://www.okx.com');
});

// BYBIT routes
app.all('/bybit/*', async (req, res) => {
  await proxyRequest(req, res, 'bybit', 'https://api.bybit.com');
});

// GATEIO routes  
app.all('/gateio/*', async (req, res) => {
  await proxyRequest(req, res, 'gateio', 'https://api.gateio.ws');
});

// Main proxy handler function
async function proxyRequest(req, res, exchangeName, baseUrl) {
  try {
    // Remove exchange prefix from path
    const targetPath = req.path.replace(`/${exchangeName}`, '');
    const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
    const targetUrl = `${baseUrl}${targetPath}${queryString ? '?' + queryString : ''}`;
    
    console.log(`[${new Date().toISOString()}] ${exchangeName.toUpperCase()} ${req.method} ${targetUrl}`);
    
    // Headers based on exchange
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive'
    };
    
    // Exchange-specific headers
    const exchangeHeaders = {
      binance: ['content-type', 'x-mbx-apikey'],
      okx: ['content-type', 'ok-access-key', 'ok-access-sign', 'ok-access-timestamp', 'ok-access-passphrase'],
      bybit: ['content-type', 'x-bapi-api-key', 'x-bapi-sign', 'x-bapi-timestamp', 'x-bapi-recv-window'],
      gateio: ['content-type', 'key', 'sign', 'timestamp']
    };
    
    // Copy exchange-specific headers
    (exchangeHeaders[exchangeName] || []).forEach(key => {
      if (req.headers[key]) headers[key] = req.headers[key];
    });
    
    // Prepare fetch options
    const options = {
      method: req.method,
      headers,
      redirect: 'follow'
    };
    
    // Add body for POST/PUT/PATCH/DELETE
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      if (req.body && Object.keys(req.body).length > 0) {
        options.body = JSON.stringify(req.body);
        options.headers['Content-Type'] = 'application/json';
      }
    }
    
    // Make request
    const response = await fetch(targetUrl, options);
    const body = await response.text();
    
    // Log errors
    if (!response.ok) {
      console.error(`[${exchangeName.toUpperCase()} ERROR] ${response.status} - ${body.substring(0, 200)}`);
    }
    
    // Forward response headers
    res.set('Content-Type', response.headers.get('content-type') || 'application/json');
    
    // Forward exchange-specific response headers
    response.headers.forEach((value, key) => {
      if (key.toLowerCase().startsWith('x-') || key.toLowerCase().includes('ratelimit')) {
        res.set(key, value);
      }
    });
    
    res.status(response.status).send(body);
    
  } catch (error) {
    console.error(`[PROXY ERROR ${exchangeName}] ${error.message}`);
    res.status(500).json({ 
      error: 'Proxy Error',
      exchange: exchangeName,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Multi-Exchange Proxy running on port ${PORT}`);
  console.log(`🌍 Region: ${process.env.RENDER_REGION || 'local'}`);
  console.log(`📡 Supported exchanges: ${Object.keys(EXCHANGES).join(', ')}`);
});

module.exports = app;
