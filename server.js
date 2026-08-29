import http from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const API_DIR = join(__dirname, 'api')
const PORT = process.env.PORT || 8787

function loadEnv() {
  const p = join(__dirname, '.env')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

async function loadHandler(file) {
  const mod = await import(pathToFileURL(join(API_DIR, file)).href)
  return mod.default
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (c) => { data += c })
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}) } catch { resolve({}) }
    })
  })
}

const server = http.createServer(async (req, res) => {
  const file = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '').replace(/\/$/, '')
  const name = file.split('/').pop() || 'index'
  const candidate = `${name}.js`
  const fullPath = join(API_DIR, candidate)

  if (!existsSync(fullPath)) {
    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ error: 'Not Found' }))
  }

  try {
    const handler = await loadHandler(candidate)
    const viteRes = {
      statusCode: 200,
      setHeader(k, v) { this._headers = this._headers || {}; this._headers[k] = v },
      status(code) { this.statusCode = code; return this },
      json(obj) {
        res.statusCode = this.statusCode
        const headers = this._headers || {}
        for (const k of Object.keys(headers)) res.setHeader(k, headers[k])
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(obj))
      },
      end(body) {
        res.statusCode = this.statusCode
        const headers = this._headers || {}
        for (const k of Object.keys(headers)) res.setHeader(k, headers[k])
        res.end(body)
      },
      _headers: {},
    }
    req.body = await readBody(req)
    await handler(req, viteRes)
  } catch (err) {
    console.error(`[api/${name}]`, err)
    if (!res.writableEnded) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: String(err.message || err) }))
    }
  }
})

loadEnv()
server.listen(PORT, () => {
  console.log(`TradeForge API local → http://localhost:${PORT}/api/...`)
})
