// scripts/test-startup-10-cycles.mjs
// Phase 6 Engine Boot Reliability Test: 10 Fresh Browser Startup Cycles
import { spawn } from 'child_process'
import http from 'http'
import path from 'path'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9222
const APP_URL = 'http://localhost:5173/'

console.log('=== CALM ROADS 2.0: 10-CYCLE FRESH ENGINE BOOT & RENDERING RELIABILITY TEST ===\n')

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
          if (page && page.webSocketDebuggerUrl) {
            resolve(page.webSocketDebuggerUrl)
          } else {
            reject(new Error('No page target'))
          }
        } catch (e) {
          reject(e)
        }
      })
    })
    req.on('error', reject)
  })
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl
    this.ws = null
    this.id = 1
    this.callbacks = new Map()
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl)
      this.ws.onopen = () => resolve()
      this.ws.onerror = (e) => reject(e)
      this.ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data)
        if (data.id && this.callbacks.has(data.id)) {
          const { res, rej } = this.callbacks.get(data.id)
          this.callbacks.delete(data.id)
          if (data.error) rej(data.error)
          else res(data.result)
        }
      }
    })
  }

  async send(method, params = {}) {
    const msgId = this.id++
    return new Promise((resolve, reject) => {
      this.callbacks.set(msgId, { res: resolve, rej: reject })
      this.ws.send(JSON.stringify({ id: msgId, method, params }))
    })
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    return res.result?.value
  }

  close() {
    if (this.ws) this.ws.close()
  }
}

async function runCycle(cycleNum) {
  const chromeArgs = [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--window-size=1280,720',
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--use-gl=angle',
    '--use-angle=d3d11',
    '--user-data-dir=' + path.join(process.env.TEMP || 'C:\\Temp', `calm-roads-boot-${cycleNum}-${Date.now()}`),
    APP_URL,
  ]

  const proc = spawn(CHROME_PATH, chromeArgs, { stdio: 'ignore' })
  try {
    let wsUrl = null
    for (let i = 0; i < 20; i++) {
      await sleep(350)
      try {
        wsUrl = await getWsUrl()
        if (wsUrl) break
      } catch (e) {}
    }
    if (!wsUrl) throw new Error('CDP connect timeout')

    const client = new CDPClient(wsUrl)
    await client.connect()
    await client.send('Page.enable')
    await client.send('Runtime.enable')

    // Wait for world ready
    let ready = false
    const startTime = Date.now()
    for (let i = 0; i < 30; i++) {
      await sleep(300)
      const res = await client.evaluate(`
        (() => {
          const canvas = document.querySelector('canvas');
          if (!canvas) return false;
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          return canvas.width > 0 && canvas.height > 0 && !!gl;
        })()
      `)
      if (res) {
        ready = true
        break
      }
    }
    const loadTimeMs = Date.now() - startTime

    // Verify 3D canvas non-zero dimensions
    const canvasStats = await client.evaluate(`
      (() => {
        const canvas = document.querySelector('canvas');
        return {
          w: canvas ? canvas.width : 0,
          h: canvas ? canvas.height : 0
        };
      })()
    `)

    client.close()
    proc.kill()

    const isSuccess = ready && canvasStats.w > 0 && canvasStats.h > 0
    console.log(`[Cycle ${cycleNum}/10]: ${isSuccess ? 'PASS' : 'FAIL'} | Canvas: ${canvasStats.w}x${canvasStats.h} | Boot: ${loadTimeMs}ms`)
    return isSuccess
  } catch (e) {
    try { proc.kill() } catch (err) {}
    console.error(`[Cycle ${cycleNum}/10]: FAIL with error:`, e.message)
    return false
  }
}

async function main() {
  let passed = 0
  for (let c = 1; c <= 10; c++) {
    const success = await runCycle(c)
    if (success) passed++
    await sleep(400)
  }

  console.log(`\n=== 10-CYCLE BOOT RESULT: ${passed}/10 PASSED (${10 - passed} Black Screens) ===`)
  process.exit(passed === 10 ? 0 : 1)
}

main()
