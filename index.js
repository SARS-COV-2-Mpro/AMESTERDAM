const express = require('express');
const axios = require('axios');
const app = express();

const NEXT_PROXY = 'https://healthy-whale-82.deno.dev';

// Remove the separate '/' route, let all() handle everything
app.all('*', async (req, res) => {
    if (req.path === '/') {
        return res.send('Amsterdam Proxy Alive');
    }
    
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

app.listen(process.env.PORT || 3000);
