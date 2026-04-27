// api/notify.js — Vercel Serverless Function
// Envoie des push notifications via Web Push (VAPID)

const https = require('https')
const crypto = require('crypto')
const url = require('url')

// ── Helpers VAPID ───────────────────────────────────────────────────

function base64urlEncode(buffer) {
  return Buffer.from(buffer).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return Buffer.from(str, 'base64')
}

function createVAPIDAuthHeader(audience, subject, publicKey, privateKey) {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + 12 * 3600

  const header = base64urlEncode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
  const payload = base64urlEncode(JSON.stringify({ aud: audience, exp, sub: subject }))
  const signingInput = `${header}.${payload}`

  const sign = crypto.createSign('SHA256')
  sign.update(signingInput)

  // Reconstruct private key in PEM
  const privRaw = base64urlDecode(privateKey)
  const pubRaw  = base64urlDecode(publicKey)

  // Build PKCS8 DER for prime256v1
  const pkcs8Prefix = Buffer.from(
    '308141020100301306072a8648ce3d020106082a8648ce3d030107042730250201010420',
    'hex'
  )
  const der = Buffer.concat([pkcs8Prefix, privRaw])
  const pem = `-----BEGIN PRIVATE KEY-----\n${der.toString('base64').match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`

  const ecdh = crypto.createSign('SHA256')
  ecdh.update(signingInput)
  const sig = ecdh.sign({ key: pem, dsaEncoding: 'ieee-p1363' })
  const signature = base64urlEncode(sig)

  return `vapid t=${header}.${payload}.${signature}, k=${publicKey}`
}

// ── Handler ─────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { subscription, title, body, url: notifUrl } = req.body || {}
  if (!subscription?.endpoint) return res.status(400).json({ error: 'subscription requise' })

  const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY
  const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
  const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@tradeforge.app'

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return res.status(500).json({ error: 'Clés VAPID manquantes' })
  }

  const endpoint = subscription.endpoint
  const parsed   = new url.URL(endpoint)
  const audience = `${parsed.protocol}//${parsed.host}`

  const payload = JSON.stringify({
    title: title || 'TradeForge',
    body:  body  || '',
    tag:   'tradeforge',
    url:   notifUrl || '/',
  })

  try {
    const authHeader = createVAPIDAuthHeader(audience, VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

    await new Promise((resolve, reject) => {
      const options = {
        method: 'POST',
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/octet-stream',
          'Content-Length': Buffer.byteLength(payload),
          'TTL': '86400',
        },
      }

      const request = https.request(options, (r) => {
        let data = ''
        r.on('data', c => data += c)
        r.on('end', () => {
          if (r.statusCode >= 200 && r.statusCode < 300) resolve(data)
          else reject(new Error(`Push failed: ${r.statusCode} ${data}`))
        })
      })
      request.on('error', reject)
      request.write(payload)
      request.end()
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Push error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}