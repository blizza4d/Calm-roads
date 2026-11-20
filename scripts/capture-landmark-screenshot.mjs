// scripts/capture-landmark-screenshot.mjs
import { spawn } from 'child_process'
import http from 'http'
import fs from 'fs'
import path from 'path'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9223
const PREVIEW_PORT = 5173
const APP_URL = `http://localhost:${PREVIEW_PORT}/`
const ARTIFACTS_DIR = 'C:\\Users\\Asus\\.gemini\\antigravity\\brain\\416ba9bb-2572-466e-b62a-3186b6e4aa33'

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function getWsUrl() {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${CDP_PORT}/json`, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          const targets = JSON.parse(data)
          const page = targets.find((t) => t.type === 'page')
          if (page && page.webSocketDebuggerUrl) resolve(page.webSocketDebuggerUrl)
          else reject(new Error('No page target found'))
        } catch (e) {
          reject(e)
        }
      })
    })
    req.on('error', reject)
  })
}

async function run() {
  const previewProcess = spawn('npx.cmd', ['vite', 'preview', '--port', String(PREVIEW_PORT), '--strictPort'], {
    cwd: path.resolve('.'),
    stdio: 'ignore',
    shell: true,
  })

  await sleep(1500)

  const chromeArgs = [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--window-size=1280,720',
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--use-gl=angle',
    '--use-angle=d3d11',
    '--user-data-dir=' + path.join(process.env.TEMP || 'C:\\Temp', 'calm-roads-landmark-' + Date.now()),
    APP_URL,
  ]

  const chrome = spawn(CHROME_PATH, chromeArgs, { stdio: 'ignore' })

  let wsUrl = null
  for (let i = 0; i < 20; i++) {
    try {
      wsUrl = await getWsUrl()
      break
    } catch {
      await sleep(300)
    }
  }

  const ws = new WebSocket(wsUrl)
  await new Promise((res) => (ws.onopen = res))

  let msgId = 1
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = msgId++
      const handler = (event) => {
        const data = JSON.parse(event.data)
        if (data.id === id) {
          ws.removeEventListener('message', handler)
          resolve(data.result)
        }
      }
      ws.addEventListener('message', handler)
      ws.send(JSON.stringify({ id, method, params }))
    })

  await send('Runtime.enable')
  await send('Page.enable')

  // Wait for canvas ready
  await sleep(3500)

  // Switch to Drone / Scenic View and capture
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyC', key: 'c', windowsVirtualKeyCode: 67 })
  await sleep(60)
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyC', key: 'c', windowsVirtualKeyCode: 67 })
  await sleep(500)

  const screenshot = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'v3-landmark-coastal-lighthouse.png'), Buffer.from(screenshot.data, 'base64'))
  console.log('[SCREENSHOT] Saved: v3-landmark-coastal-lighthouse.png')

  ws.close()
  chrome.kill()
  previewProcess.kill()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
