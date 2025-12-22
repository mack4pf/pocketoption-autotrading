const http = require('http');

// Configuration
const PORT = 5008;
const ADMIN_SECRET = 'YOUR_ADMIN_SECRET'; // Default from env/instructions

// 1. Test External "BUY" Signal
const signalPayload = JSON.stringify({
    ticker: "EURUSD",
    signal: "buy",
    price: 1.0543,
    time: "2023-10-27T10:00:00Z"
});

// 2. Test External "WIN" Result
const resultPayload = JSON.stringify({
    ticker: "EURUSD",
    signal: "WIN",
    price: 1.0553,
    time: "2023-10-27T10:05:00Z"
});

function sendRequest(path, payload, label) {
    const options = {
        hostname: 'localhost',
        port: PORT,
        path: path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': payload.length,
            'X-Admin-Secret': ADMIN_SECRET
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log(`\n--- ${label} ---`);
            console.log(`Status: ${res.statusCode}`);
            console.log('Response:', data);
        });
    });

    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
    });

    req.write(payload);
    req.end();
}

console.log("🚀 Testing External Signal Adapter...");
sendRequest('/api/signals/create', signalPayload, 'Sending BUY Signal');

setTimeout(() => {
    sendRequest('/api/signals/result', resultPayload, 'Sending WIN Result');
}, 2000);
