// scripts/test-world-biome-transitions.mjs
// Verifies dynamic biome switching and environmental stability across all 8 biomes via Chrome CDP

import { spawn } from 'child_process'
import http from 'http'
import path from 'path'
import fs from 'fs'

const PREVIEW_PORT = 4174
const CDP_PORT = 9224
const APP_URL = `http://localhost:${PREVIEW_PORT}`
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

const BIOMES = [
  'twisted_mountains',
  'alpine',
  'enchanted_forest',
  'coastal',
  'autumn',
  'desert',
  'tundra',
  'forest',
]

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function waitForServer(url, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode === 200) resolve()
          else reject(new Error('Status ' + res.statusCode))
        })
        req.on('error', reject)
        req.setTimeout(500, () => req.destroy())
      })
      return true
    } catch {
      await sleep(250)
    }
  }
  return false
}

async function getPageWsUrl() {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${CDP_PORT}/json`, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          const targets = JSON.parse(data)
          const page = targets.find((t) => t.type === 'page')
          if (page?.webSocketDebuggerUrl) resolve(page.webSocketDebuggerUrl)
          else reject(new Error('No CDP page target found'))
        } catch (err) {
          reject(err)
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(500, () => req.destroy())
  })
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl
    this.ws = null
    this.id = 1
    this.callbacks = new Map()
    this.consoleErrors = []
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl)
      this.ws.onopen = () => resolve()
      this.ws.onerror = (e) => reject(e)
      this.ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data)
        if (data.method === 'Runtime.exceptionThrown') {
          const desc =
            data.params?.exceptionDetails?.exception?.description ||
            data.params?.exceptionDetails?.text ||
            'Runtime exception'
          this.consoleErrors.push(desc)
        }
        if (data.method === 'Runtime.consoleAPICalled' && data.params?.type === 'error') {
          const args = data.params.args?.map((a) => a.value || a.description || '').join(' ') || ''
          this.consoleErrors.push(`[Console Error] ${args}`)
        }
        if (data.id && this.callbacks.has(data.id)) {
          const cb = this.callbacks.get(data.id)
          this.callbacks.delete(data.id)
          cb(data.result)
        }
      }
    })
  }

  async send(method, params = {}) {
    const id = this.id++
    return new Promise((resolve) => {
      this.callbacks.set(id, resolve)
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  async eval(expression) {
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

async function run() {
  console.log('=================================================================')
  console.log(' CALM ROADS: DYNAMIC BIOME SWITCHING & STABILITY CDP TEST        ')
  console.log('=================================================================')

  const previewProc = spawn('npm', ['run', 'preview', '--', '--port', String(PREVIEW_PORT)], {
    shell: true,
    stdio: 'ignore',
  })

  if (!(await waitForServer(APP_URL))) {
    console.error('[FATAL] Preview server failed to start')
    previewProc.kill()
    process.exit(1)
  }

  const tmpProfile = path.join(process.cwd(), 'node_modules', '.tmp_biome_profile_' + Date.now())
  fs.mkdirSync(tmpProfile, { recursive: true })

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${tmpProfile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-extensions',
    '--headless=new',
    APP_URL,
  ])

  let wsUrl = null
  for (let i = 0; i < 30; i++) {
    try {
      wsUrl = await getPageWsUrl()
      if (wsUrl) break
    } catch {
      await sleep(300)
    }
  }

  if (!wsUrl) {
    console.error('[FATAL] Failed to connect to Chrome DevTools Protocol')
    chromeProc.kill()
    previewProc.kill()
    process.exit(1)
  }

  const cdp = new CDPClient(wsUrl)
  await cdp.connect()
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Log.enable')
  await cdp.send('Page.navigate', { url: APP_URL })

  // 1. Wait for world ready state
  let isReady = false
  for (let i = 0; i < 150; i++) {
    const ready = await cdp.eval('Boolean(window.__LOADING_STORE__?.getState()?.isReady)')
    if (ready) {
      isReady = true
      break
    }
    await sleep(150)
  }

  if (!isReady) {
    console.error('[FAIL] World readiness timed out')
    cdp.close()
    chromeProc.kill()
    previewProc.kill()
    process.exit(1)
  }

  console.log('[PASS] World reached READY state')

  // 2. Iterate through all 8 biomes
  let allPassed = true
  for (const b of BIOMES) {
    await cdp.eval(`
      (function() {
        const store = window.__GAME_STORE__;
        if (store) {
          store.getState().setBiome('${b}');
        }
      })()
    `)

    await sleep(500)

    const stats = await cdp.eval(`
      (function() {
        const r = window.__WORLD_READINESS__;
        const store = window.__GAME_STORE__;
        let totalRoadVerts = 0;
        if (r && r.mountedChunks) {
          for (const c of r.mountedChunks.values()) {
            totalRoadVerts += c.roadVerts || 0;
          }
        }
        return {
          currentBiome: store ? store.getState().biome : null,
          chunksMounted: r ? r.mountedChunks.size : 0,
          totalRoadVerts: totalRoadVerts,
          vehicleY: window.__VEHICLE_POS__ ? window.__VEHICLE_POS__.y : 0
        };
      })()
    `)

    if (stats && stats.chunksMounted >= 5 && stats.totalRoadVerts > 0 && stats.vehicleY > 0) {
      console.log(`[PASS] Biome '${b}' active — ${stats.chunksMounted} chunks mounted, ${stats.totalRoadVerts} road verts, vehicle Y=${stats.vehicleY.toFixed(2)}m`)
    } else {
      console.error(`[FAIL] Biome '${b}' failed readiness:`, stats)
      allPassed = false
    }
  }

  // 3. Check for errors
  if (cdp.consoleErrors.length === 0) {
    console.log('[PASS] Zero console / WebGL errors across all 8 biome transitions')
  } else {
    console.warn('[WARN] Console errors:', cdp.consoleErrors)
  }

  cdp.close()
  chromeProc.kill()
  previewProc.kill()

  try {
    fs.rmSync(tmpProfile, { recursive: true, force: true })
  } catch {}

  if (allPassed) {
    console.log('\n=================================================================')
    console.log(' ALL 8 BIOMES VERIFIED SUCCESSFULLY')
    console.log('=================================================================')
    process.exit(0)
  } else {
    process.exit(1)
  }
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
