const ac = require('@antiadmin/anticaptchaofficial');

class CaptchaService {
    constructor() {
        // API Key should be set in environment variables
        // The user must add ANTICAPTCHA_KEY to .env
        this.apiKey = process.env.ANTICAPTCHA_KEY;
        if (this.apiKey) {
            ac.setAPIKey(this.apiKey);
            console.log('✅ Anti-Captcha service initialized');
        } else {
            console.warn('⚠️ Anti-Captcha API Key is MISSING in .env! Captcha solving will fail.');
        }
    }

    /**
     * Solves a reCAPTCHA V2 (Proxyless or with Proxy if configured in future)
     * For now, using proxyless as we are running locally/server side but might need proxy later.
     * @param {string} url - The URL of the page containing the captcha
     * @param {string} siteKey - The `data-sitekey` from the captcha element
     * @returns {Promise<string>} - The g-recaptcha-response token
     */
    async solveRecaptchaV2(url, siteKey) {
        if (!process.env.ANTICAPTCHA_KEY) throw new Error('Anti-Captcha API Key missing');

        console.log(`🧩 Sending Recaptcha V2 task... SiteKey: ${siteKey.substring(0, 10)}...`);
        try {
            // Using proxyless for now as it's simpler and works for most standard implementations
            // If the site has high security checking IP match, we will need to pass proxy details here
            const token = await ac.solveRecaptchaV2Proxyless(url, siteKey);
            console.log('✅ Captcha solved successfully!');
            return token;
        } catch (error) {
            console.error('❌ Captcha solving failed:', error);
            throw error;
        }
    }

    /**
     * Solves an image captcha (fallback)
     * @param {string} bodyBase64 - Base64 string of the image
      */
    async solveImage(bodyBase64) {
        if (!process.env.ANTICAPTCHA_KEY) throw new Error('Anti-Captcha API Key missing');

        console.log('🧩 Sending Image Captcha task...');
        try {
            const text = await ac.solveImage(bodyBase64, true);
            console.log(`✅ Image solved: ${text}`);
            return text;
        } catch (error) {
            console.error('❌ Image solving failed:', error);
            throw error;
        }
    }

    async getBalance() {
        if (!process.env.ANTICAPTCHA_KEY) return 0;
        try {
            return await ac.getBalance();
        } catch (e) {
            return 0;
        }
    }
}

module.exports = new CaptchaService();
