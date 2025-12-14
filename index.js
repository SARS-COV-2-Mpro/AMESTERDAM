const express = require('express');
const axios = require('axios');
const app = express();

const NEXT_PROXY = 'https://healthy-whale-82.deno.dev';

app.all('/*', async (req, res) => {
    try {
        const response = await axios({
            method: req.method,
            url: NEXT_PROXY + req.path,
            params: req.query,
            headers: {
                'x-mbx-apikey': req.headers['x-mbx-apikey'] || ''
            }
        });
        res.json(response.data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/', (req, res) => res.send('Amesterdam Proxy Alive'));

app.listen(process.env.PORT || 3000);
