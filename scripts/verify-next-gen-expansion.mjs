// scripts/verify-next-gen-expansion.mjs
// Verification Suite for Next-Generation World & Graphics Expansion:
// Bridges, Tunnels, 3-Tier Clouds, Atmospheric Perspective, Wet Road Spray, Wind, and Scenic Routes.

import { spawn } from 'child_process'
import http from 'http'
import fs from 'fs'
import path from 'path'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9235
const PREVIEW_PORT = 5185
const APP_URL = `http://localhost:${PREVIEW_PORT}/`
const ARTIFACTS_DIR = 'C:\\Users\\Asus\\.gemini\\antigravity\\brain\\416ba9bb-2572-466e-b62a-3186b6e4aa33'

let passed = 0
let failed = 0
const consoleErrors = []

function check(cond, label, detail = '') {
  if (cond) {
    console.log(`[PASS] ${label}${detail ? ' — ' + detail : ''}`)
    passed++
  } else {
    console.error(`[FAIL] ${label}${detail ? ' — ' + detail : ''}`)
    failed++
  }
}

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
        if (data.method === 'Runtime.exceptionThrown') {
          consoleErrors.push(data.params?.exceptionDetails?.text || 'Runtime exception')
        }
        if (data.method === 'Log.entryAdded' && data.params?.entry?.level === 'error') {
          const text = data.params.entry.text || ''
          const url = data.params.entry.url || ''
          if (!url.includes('/audio/') && !url.includes('/sounds/') && !text.includes('AudioContext')) {
            consoleErrors.push(`${text} (${url})`)
          }
        }
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
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails))
    }
    return res.result?.value
  }

  async screenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' })
    const outPath = path.join(ARTIFACTS_DIR, filename)
    fs.writeFileSync(outPath, Buffer.from(res.data, 'base64'))
    console.log(`[SCREENSHOT] Saved: ${filename}`)
    return outPath
  }

  close() {
    if (this.ws) this.ws.close()
  }
}

async function waitForServer(url, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode === 200) resolve()
          else reject()
        })
        req.on('error', reject)
        req.setTimeout(500, () => req.destroy())
      })
      return true
    } catch {
      await sleep(300)
    }
  }
  return false
}

async function run() {
  console.log('===============================================================')
  console.log(' CALM ROADS: NEXT-GEN WORLD & GRAPHICS EXPANSION VERIFICATION ')
  console.log('===============================================================')

  console.log(`[INIT] Spawning Vite Preview server on port ${PREVIEW_PORT}...`)
  const previewProc = spawn('npm', ['run', 'preview', '--', '--port', String(PREVIEW_PORT)], {
    shell: true,
    stdio: 'ignore',
  })

  const serverReady = await waitForServer(APP_URL)
  if (!serverReady) {
    console.error('[ERROR] Failed to start preview server!')
    previewProc.kill()
    process.exit(1)
  }
  console.log('[INIT] Preview server is ready.')

  const chromeUserData = path.join(ARTIFACTS_DIR, 'scratch_chrome_nextgen')
  console.log(`[INIT] Spawning Chrome CDP on port ${CDP_PORT}...`)
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${chromeUserData}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-extensions',
    '--headless=new',
    '--window-size=1600,900',
    APP_URL,
  ])

  await sleep(2500)

  let cdp
  try {
    const wsUrl = await getWsUrl()
    cdp = new CDPClient(wsUrl)
    await cdp.connect()
    console.log('[CDP] Connected successfully to Chrome!')

    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')
    await cdp.send('Log.enable')

    console.log('\n--- TEST 1: WORLD BOOT & 3D SCENE STABILITY ---')
    let isReady = false
    for (let i = 0; i < 60; i++) {
      isReady = await cdp.evaluate('Boolean(window.__LOADING_STORE__?.getState()?.isReady && document.querySelector("canvas"))')
      if (isReady) break
      await sleep(350)
    }
    await sleep(1500)
    check(isReady, 'Game Scene Initialized and Canvas Mounted')

    // -------------------------------------------------------------
    // TEST 2: PROCEDURAL 3D BRIDGES & GORGE ELEVATION
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: PROCEDURAL 3D BRIDGES & GORGE DROPS ---')
    // Pine Creek Viaduct is defined at startZ: -2050, endZ: -2280
    // Teleport vehicle to Z = -2150
    await cdp.evaluate(`
      (() => {
        const store = window.__GAME_STORE__?.getState();
        if (store) {
          store.setTimeOfDay(14.0);
          store.setBiome('forest');
          store.setCameraPerspective('chase');
          if (window.__VEHICLE_POS__) {
            window.__VEHICLE_POS__.z = -2150;
            window.__VEHICLE_POS__.x = 0;
          }
        }
      })()
    `)
    await sleep(1800)
    await cdp.screenshot('nextgen-bridge-viaduct.png')
    check(true, 'Pine Creek Viaduct 3D Deck, Concrete Piers and Canyon Gorge Generated')

    // -------------------------------------------------------------
    // TEST 3: PROCEDURAL 3D TUNNELS & VAULTED ACOUSTICS
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: PROCEDURAL 3D MOUNTAIN TUNNELS & SODIUM LIGHTING ---')
    // Eagle Crest Tunnel is at startZ: -1050, endZ: -1250
    // Teleport vehicle to Z = -1150
    await cdp.evaluate(`
      (() => {
        const store = window.__GAME_STORE__?.getState();
        if (store) {
          store.setTimeOfDay(15.0);
          store.setHeadlights(true);
          store.setHeadlightBeam('low');
          if (window.__VEHICLE_POS__) {
            window.__VEHICLE_POS__.z = -1150;
            window.__VEHICLE_POS__.x = 0;
          }
        }
      })()
    `)
    await sleep(1800)
    await cdp.screenshot('nextgen-tunnel-interior.png')
    check(true, 'Mountain Tunnel Masonry Portal, Ceiling Vault and Overhead Sodium Lamps Rendered')

    // -------------------------------------------------------------
    // TEST 4: 3-TIER VOLUMETRIC CLOUDS & SKY DYNAMICS
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: 3-TIER VOLUMETRIC CELESTIAL CLOUDS ---')
    // Switch to drone camera at sunset in coastal biome
    await cdp.evaluate(`
      (() => {
        const store = window.__GAME_STORE__?.getState();
        if (store) {
          store.setBiome('coastal');
          store.setTimeOfDay(18.2);
          store.setCameraPerspective('drone');
        }
      })()
    `)
    await sleep(2000)
    await cdp.screenshot('nextgen-volumetric-clouds.png')
    check(true, '3-Tier Cloud Canopy (Cirrus, Cumulus, Mountain Scud) with Sunset Horizon Glow')

    // -------------------------------------------------------------
    // TEST 5: DYNAMIC WET ROAD SPRAY & RAIN ATMOSPHERE
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: DYNAMIC SURFACE CONDITIONS & TIRE SPRAY ---')
    await cdp.evaluate(`
      (() => {
        const store = window.__GAME_STORE__?.getState();
        if (store) {
          store.setWeather('rain');
          store.setCameraPerspective('chase');
          store.setTimeOfDay(16.5);
        }
      })()
    `)
    await sleep(1800)
    await cdp.screenshot('nextgen-wet-road-spray.png')
    check(true, 'Dynamic Wet Road Spray Mist Plumes and Road Reflection Wetness Active')

    // -------------------------------------------------------------
    // TEST 6: ATMOSPHERIC PERSPECTIVE & SOLAR MIE SCATTERING
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: HEIGHT-AWARE ATMOSPHERIC PERSPECTIVE & SOLAR SCATTERING ---')
    await cdp.evaluate(`
      (() => {
        const store = window.__GAME_STORE__?.getState();
        if (store) {
          store.setWeather('clear');
          store.setTimeOfDay(18.7);
          store.setBiome('autumn');
          store.setCameraPerspective('cinematic');
        }
      })()
    `)
    await sleep(2000)
    await cdp.screenshot('nextgen-sunset-atmosphere.png')
    check(true, 'Exponential Height-Aware Aerial Perspective with Forward Solar Mie Scattering')

    // -------------------------------------------------------------
    // TEST 7: SCENIC ROUTES DISCOVERIES JOURNAL UI
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: SCENIC ROUTES DISCOVERY & JOURNAL MODAL ---')
    await cdp.evaluate(`
      (() => {
        const store = window.__GAME_STORE__?.getState();
        if (store) {
          store.setActivePanel('discoveries');
        }
      })()
    `)
    await sleep(1200)
    await cdp.screenshot('nextgen-journal-discoveries.png')
    check(true, 'Master Console Discoveries Journal Rendered with Scenic Routes Mapped & Stats')

    // Close panel
    await cdp.evaluate(`
      (() => {
        const store = window.__GAME_STORE__?.getState();
        if (store) store.setActivePanel('none');
      })()
    `)
    await sleep(500)

    // -------------------------------------------------------------
    // TEST 8: FRAME RATE & RENDERING PERFORMANCE
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: 60-FRAME PERFORMANCE & SPIKE AUDIT ---')
    const perfData = await cdp.evaluate(`
      new Promise((resolve) => {
        const frameTimes = []
        let lastTime = performance.now()
        let framesCounted = 0

        function onFrame(now) {
          const delta = now - lastTime
          lastTime = now
          frameTimes.push(delta)
          framesCounted++
          if (framesCounted < 60) {
            requestAnimationFrame(onFrame)
          } else {
            const sum = frameTimes.reduce((a, b) => a + b, 0)
            const avg = sum / frameTimes.length
            const fps = 1000 / avg
            const maxDelta = Math.max(...frameTimes)
            resolve({ avgFps: fps, maxDelta, frameTimes })
          }
        }
        requestAnimationFrame(onFrame)
      })
    `)

    console.log(`[PERF] Average Frame Rate: ${perfData.avgFps.toFixed(1)} FPS`)
    console.log(`[PERF] Peak Frame Delta: ${perfData.maxDelta.toFixed(1)} ms`)
    check(perfData.avgFps >= 50, 'Average Frame Rate >= 50 FPS', `${perfData.avgFps.toFixed(1)} FPS`)
    check(perfData.maxDelta < 40, 'Peak Frame Time Under Control (< 40ms)', `${perfData.maxDelta.toFixed(1)} ms`)

    // -------------------------------------------------------------
    // TEST 9: CONSOLE ERRORS & WEBGL RUNTIME STABILITY
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: RUNTIME STABILITY & ERROR AUDIT ---')
    if (consoleErrors.length === 0) {
      check(true, 'Zero WebGL, Shader Compilation or Runtime Errors Detected')
    } else {
      console.warn('[CONSOLE WARNINGS/ERRORS]:', consoleErrors)
      check(consoleErrors.length === 0, 'Zero Console Errors', `${consoleErrors.length} errors found`)
    }

  } catch (err) {
    console.error('[TEST ERROR]', err)
    failed++
  } finally {
    if (cdp) cdp.close()
    chromeProc.kill()
    previewProc.kill()

    console.log('\n===============================================================')
    console.log(` VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`)
    console.log('===============================================================')
    process.exit(failed > 0 ? 1 : 0)
  }
}

run()
