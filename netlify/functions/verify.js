// Checks a Payhip licence key. The secret key lives in Netlify's environment
// variables (PAYHIP_PRODUCT_SECRET), never in this file or in the app.
exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  const send = (statusCode, obj) => ({ statusCode, headers, body: JSON.stringify(obj) });

  if (event.httpMethod !== 'POST') return send(405, { error: 'method' });

  let key = '';
  try { key = String(JSON.parse(event.body || '{}').licenseKey || '').trim().toUpperCase(); } catch (e) {}
  if (!/^[A-Z0-9-]{8,64}$/.test(key)) return send(200, { valid: false });

  const secret = process.env.PAYHIP_PRODUCT_SECRET;
  if (!secret) return send(500, { error: 'not configured' });

  try {
    const r = await fetch('https://payhip.com/api/v2/license/verify?license_key=' + encodeURIComponent(key), {
      method: 'GET',
      headers: { 'product-secret-key': secret }
    });
    if (r.status === 401 || r.status === 403) return send(500, { error: 'auth' });
    if (r.status >= 500) return send(502, { error: 'upstream' });
    let j = null;
    try { j = await r.json(); } catch (e) {}
    const enabled = !!(j && j.data && (j.data.enabled === true || j.data.enabled === 'true'));
    return send(200, { valid: enabled });
  } catch (e) {
    return send(502, { error: 'upstream' });
  }
};
