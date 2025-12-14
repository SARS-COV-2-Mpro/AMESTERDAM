const express = require('express');
const axios = require('axios');
const app = express();

const DENO_PROXY = 'https://healthy-whale-82.deno.dev';

app.get('/', (req, res) => {
    res.send('Amsterdam Proxy → Deno Germany → Binance');
});

app.all('*', async (req, res) => {
    try {
        const response = await axios({
            method: req.method,
            url: DENO_PROXY + req.originalUrl,
            headers: {
                'x-mbx-apikey': req.headers['x-mbx-apikey'] || ''
            },
            timeout: 10000
        });
        res.json(response.data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(process.env.PORT || 3000);
