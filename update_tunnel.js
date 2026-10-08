const TUNNEL_URL = 'https://engaged-time-abstract-league.trycloudflare.com';
const FIREBASE_PROJECT_ID = 'meesho-otp-app';

(async () => {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/config/server?updateMask.fieldPaths=apiUrl&updateMask.fieldPaths=tunnelUrl&updateMask.fieldPaths=lastOnline`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        apiUrl: { stringValue: TUNNEL_URL },
        tunnelUrl: { stringValue: TUNNEL_URL },
        lastOnline: { stringValue: new Date().toISOString() }
      }
    })
  });
  const data = await res.json();
  if (data.fields) {
    console.log('SUCCESS: Web app now using local server via tunnel');
    console.log('Tunnel URL:', TUNNEL_URL);
  } else {
    console.log('Result:', JSON.stringify(data));
  }
})().catch(console.error);
