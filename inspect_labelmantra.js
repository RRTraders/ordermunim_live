(async () => {
  try {
    const res = await fetch('https://labelmantra.in/assets/index-21985213.js');
    const text = await res.text();
    console.log('JS Bundle Size:', (text.length / 1024).toFixed(1), 'KB');
    
    // Check routes
    const routes = text.match(/path:\s*["'][^"']+["']/g) || [];
    console.log('Routes:', routes.slice(0, 20));

    // Check pricing
    const pricing = text.match(/₹\s*\d+/g) || [];
    console.log('Prices found:', [...new Set(pricing)]);

    // Check features
    const features = text.match(/[A-Z][a-zA-Z\s]{3,30}(?:Label|Crop|Order|Return|OTP|Meesho|Amazon|Flipkart)/g) || [];
    console.log('Features:', [...new Set(features)].slice(0, 20));

    // Search for OTP / Return
    const otpKeywords = ['otp', 'OTP', 'return', 'Return', 'handover', 'Handover'];
    for (const kw of otpKeywords) {
      const idx = text.indexOf(kw);
      if (idx !== -1) {
        console.log(`Found "${kw}":`, text.substring(Math.max(0, idx - 40), Math.min(text.length, idx + 80)));
      }
    }
  } catch (e) {
    console.error(e);
  }
})();
