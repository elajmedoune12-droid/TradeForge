import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const children = []
let shuttingDown = false

function start(args) {
  const c = spawn(process.execPath, args, { stdio: 'inherit' })
  children.push(c)
  c.on('exit', (code) => {
    if (!shuttingDown && code !== 0) process.exit(code)
  })
  return c
}

start([join(__dirname, 'server.js')])
start([join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js')])

function shutdown() {
  if (shuttingDown) return
  shuttingDown = true
  for (const c of children) {
    try { c.kill() } catch {}
  }
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
