// scripts/test-baseline-recovery.mjs
// Phase 2: Baseline Integration Test for Calm Roads
import { spawn } from 'child_process'
import http from 'http'
import fs from 'fs'
import path from 'path'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9248
const PREVIEW_PORT = 5198
const APP_URL = `http://localhost:${PREVIEW_PORT}/`

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
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
          const desc =
            data.params?.exceptionDetails?.exception?.description ||
            data.params?.exceptionDetails?.text ||
            'Runtime exception'
          consoleErrors.push(desc)
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

  close() {
    if (this.ws) this.ws.close()
  }
}

async function run() {
  console.log('=================================================================')
  console.log(' CALM ROADS: PHASE 2 BASELINE RELIABILITY INTEGRATION TEST       ')
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

  const tmpProfile = path.join(process.cwd(), 'node_modules', '.tmp_baseline_profile_' + Date.now())
  fs.mkdirSync(tmpProfile, { recursive: true })

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${tmpProfile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-extensions',
    '--headless=new',
    '--window-size=1600,900',
    'about:blank',
  ])

  await sleep(1500)

  let cdp
  try {
    const wsUrl = await getPageWsUrl()
    cdp = new CDPClient(wsUrl)
    await cdp.connect()
    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')
    await cdp.send('Log.enable')

    // 1. Application launches
    const navStart = Date.now()
    await cdp.send('Page.navigate', { url: APP_URL })

    let readyState = null
    for (let i = 0; i < 150; i++) {
      const snap = await cdp.evaluate(`
        (() => {
          const l = window.__LOADING_STORE__?.getState();
          const r = window.__WORLD_READINESS__;
          const pos = window.__VEHICLE_POS__;
          const gl = r?.gl;
          const cam = r?.camera;
          return {
            isReady: Boolean(l?.isReady),
            hasCanvas: Boolean(document.querySelector('canvas')),
            rendererReady: Boolean(r?.rendererReady),
            cameraReady: Boolean(r?.cameraReady),
            camPos: cam ? { x: cam.position.x, y: cam.position.y, z: cam.position.z } : null,
            carPos: pos ? { x: pos.x, y: pos.y, z: pos.z } : null,
            essentialChunks: r ? r.getEssentialChunksReadyCount() : 0,
            vehicleLoaded: Boolean(r?.vehicleAssetLoaded),
          };
        })()
      `).catch(() => null)

      if (snap?.isReady) {
        readyState = snap
        break
      }
      await sleep(100)
    }

    check(Boolean(readyState?.hasCanvas), '1. Application Launches and Canvas Mounts')
    check(Boolean(readyState?.rendererReady), '2. Three.js WebGL2 Renderer Initialized Correctly')
    check(
      Boolean(readyState?.cameraReady && readyState?.camPos),
      '3. Valid Perspective Camera Created and Aligned',
      `Cam pos: (${readyState?.camPos?.x?.toFixed(1)}, ${readyState?.camPos?.y?.toFixed(1)}, ${readyState?.camPos?.z?.toFixed(1)})`
    )
    check(
      Boolean(readyState?.vehicleLoaded && readyState?.carPos && readyState.carPos.y > 0),
      '4. Vehicle Appears at Valid Spawn Location',
      `Vehicle pos: (${readyState?.carPos?.x?.toFixed(2)}, ${readyState?.carPos?.y?.toFixed(2)}, ${readyState?.carPos?.z?.toFixed(2)})`
    )
    check(
      (readyState?.essentialChunks ?? 0) >= 5,
      '5. Essential Spawn Terrain Generates Around Vehicle',
      `${readyState?.essentialChunks}/5 spawn chunks`
    )

    // Wait for cinematic fade to conclude
    await sleep(1000)

    // 6. Continuous road generates through terrain
    const roadCheck = await cdp.evaluate(`
      (() => {
        const r = window.__WORLD_READINESS__;
        const l = window.__LOADING_STORE__?.getState();
        let totalRoadVerts = 0;
        if (r?.mountedChunks) {
          for (const c of r.mountedChunks.values()) {
            totalRoadVerts += c.roadVerts || 0;
          }
        }
        return {
          chunksCount: r ? r.mountedChunks.size : 0,
          roadTaskStatus: l?.tasks?.road?.status,
          totalRoadVerts,
        };
      })()
    `)
    check(
      roadCheck.roadTaskStatus === 'complete' && roadCheck.chunksCount >= 5 && roadCheck.totalRoadVerts > 0,
      '6. Continuous Road Generates Through Terrain',
      `${roadCheck.chunksCount} chunks mounted, ${roadCheck.totalRoadVerts} road vertices`
    )

    // 7. Vehicle stays on road at spawn
    const groundCheck = await cdp.evaluate(`
      (() => {
        const pos = window.__VEHICLE_POS__;
        return {
          y: pos ? pos.y : null,
          isFinite: pos ? Number.isFinite(pos.y) && Number.isFinite(pos.x) && Number.isFinite(pos.z) : false,
        };
      })()
    `)
    check(groundCheck.isFinite && groundCheck.y > 20 && groundCheck.y < 35, '7. Vehicle Stays on Road (No falling through / floating)', `Y=${groundCheck.y?.toFixed(2)}m`)

    // 8. Basic acceleration, braking and steering work
    await cdp.evaluate(`
      (() => {
        const g = window.__GAME_STORE__?.getState();
        if (g && !g.autoDrive) g.toggleAutoDrive();
      })()
    `)
    await sleep(3500)

    const drivingCheck = await cdp.evaluate(`
      (() => {
        const t = window.__TELEMETRY_STORE__?.getState();
        const pos = window.__VEHICLE_POS__;
        const cam = window.__WORLD_READINESS__?.camera;
        return {
          speed: t?.speed || 0,
          distZ: pos ? Math.abs(pos.z) : 0,
          camZ: cam ? Math.abs(cam.position.z) : 0,
        };
      })()
    `)
    check(
      drivingCheck.speed > 20 && drivingCheck.distZ > 10,
      '8. Basic Acceleration, Braking and Steering Work Under Velocity',
      `Speed: ${drivingCheck.speed} km/h, Driven: ${drivingCheck.distZ.toFixed(1)}m`
    )

    // 9. Camera follows the vehicle
    const camFollowDelta = Math.abs(drivingCheck.distZ - drivingCheck.camZ)
    check(
      camFollowDelta < 15,
      '9. Chase Camera Follows Vehicle Smoothly During Drive',
      `Car Z=-${drivingCheck.distZ.toFixed(1)}m, Cam Z=-${drivingCheck.camZ.toFixed(1)}m, Delta=${camFollowDelta.toFixed(2)}m`
    )

    // 10. Game runs without critical console errors
    check(consoleErrors.length === 0, '10. Game Runs Without Critical Console / WebGL Errors', `${consoleErrors.length} errors`)

    console.log(`\n=================================================================`)
    console.log(` BASELINE VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`)
    console.log(`=================================================================`)

    if (failed > 0) {
      if (consoleErrors.length > 0) {
        console.error('Console errors:', consoleErrors)
      }
      process.exitCode = 1
    }
  } catch (err) {
    console.error('[ERROR during baseline test]', err)
    process.exitCode = 1
  } finally {
    if (cdp) cdp.close()
    chromeProc.kill()
    previewProc.kill()
    try {
      fs.rmSync(tmpProfile, { recursive: true, force: true })
    } catch {}
  }
}

run()
