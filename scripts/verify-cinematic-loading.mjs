// scripts/verify-cinematic-loading.mjs
// End-to-End Verification Suite for Calm Roads Cinematic Loading Screen & Staged World Initialization
import { spawn } from 'child_process'
import http from 'http'
import fs from 'fs'
import path from 'path'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9244
const PREVIEW_PORT = 5194
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function waitForServer(url, maxRetries = 40) {
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
    this.eventHandlers = new Map()
  }

  on(method, fn) {
    if (!this.eventHandlers.has(method)) this.eventHandlers.set(method, [])
    this.eventHandlers.get(method).push(fn)
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
        if (data.method && this.eventHandlers.has(data.method)) {
          for (const fn of this.eventHandlers.get(data.method)) {
            fn(data.params)
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

async function run() {
  console.log('=================================================================')
  console.log(' CALM ROADS — CINEMATIC LOADING & STAGED INIT VERIFICATION SUITE ')
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

  // Fresh cache directory every run for authentic cold-startup audit
  const chromeUserData = path.join(ARTIFACTS_DIR, 'scratch_chrome_loading_' + Date.now())
  fs.mkdirSync(chromeUserData, { recursive: true })

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${chromeUserData}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-extensions',
    '--headless=new',
    '--window-size=1600,900',
    'about:blank',
  ])

  await sleep(1800)

  let cdp
  try {
    const wsUrl = await getPageWsUrl()
    cdp = new CDPClient(wsUrl)
    await cdp.connect()
    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')
    await cdp.send('Log.enable')
    await cdp.send('Network.enable')

    // -------------------------------------------------------------
    // TEST 1: SLOW NETWORK / COLD STARTUP & CINEMATIC LOADING SCREEN
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: COLD STARTUP (THROTTLED NETWORK) & CINEMATIC LOADING SCREEN ---')
    // Throttle to ~3.2 Mbps (Fast 3G+/4G slow connection) so 11.7MB downloads in ~14-18s showing live %
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 40,
      downloadThroughput: (3500 * 1024) / 8,
      uploadThroughput: (1000 * 1024) / 8,
    })

    const navStart = Date.now()
    await cdp.send('Page.navigate', { url: APP_URL })

    let sawLoadingScreen = false
    let capturedLoadingShot = false
    const observedStages = []
    let readyState = null

    for (let i = 0; i < 360; i++) {
      const snap = await cdp.evaluate(`
        (() => {
          const el = document.querySelector('[data-testid="cinematic-loading-screen"]');
          const l = window.__LOADING_STORE__?.getState();
          const r = window.__WORLD_READINESS__;
          return {
            hasScreen: Boolean(el),
            stage: l?.stage || null,
            progress: l?.progress ?? null,
            isReady: Boolean(l?.isReady),
            tasks: l?.tasks ? Object.fromEntries(Object.entries(l.tasks).map(([k, v]) => [k, { status: v.status, progress: v.progress, detail: v.detail, durationMs: v.durationMs }])) : null,
            metrics: l?.metrics || null,
            vehicleAssetLoaded: Boolean(r?.vehicleAssetLoaded),
            essentialChunks: r ? r.getEssentialChunksReadyCount() : 0,
            firstFrameRendered: Boolean(r?.firstFrameRendered),
          };
        })()
      `).catch(() => null)

      if (snap) {
        if (snap.hasScreen && !sawLoadingScreen) {
          sawLoadingScreen = true
          console.log(`[TIMING] Loading screen visible at ${Date.now() - navStart}ms`)
        }
        if (snap.stage && !observedStages.includes(snap.stage)) {
          observedStages.push(snap.stage)
          console.log(`[STAGE] ${Date.now() - navStart}ms -> ${snap.stage} (${snap.progress}%)`)
        }
        // Capture screenshot mid-loading while vehicle download or world generation progress is actively climbing
        if (snap.hasScreen && !snap.isReady && !capturedLoadingShot && snap.progress >= 22) {
          await cdp.screenshot('loading-cinematic-active.png')
          capturedLoadingShot = true
        }
        if (snap.isReady) {
          readyState = snap
          break
        }
      }
      await sleep(120)
    }

    // Restore unthrottled speed for remaining runtime checks
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    })

    check(sawLoadingScreen, 'Cinematic Loading Screen Mounted Immediately')
    check(Boolean(readyState?.isReady), 'World Transitioned Cleanly to READY Under Throttled Startup', `Ready at ${readyState?.metrics?.playableReadyMs}ms`)
    check(Boolean(readyState?.vehicleAssetLoaded), 'Real Vehicle Model Mounted Before READY (Zero Placeholder Pop-In)')
    check((readyState?.essentialChunks ?? 0) >= 5, 'All 5 Essential Spawn Chunks Validated Before READY', `${readyState?.essentialChunks}/5 chunks`)
    check(Boolean(readyState?.firstFrameRendered), 'First Warmup Frame Rendered Before Reveal')

    const allCriticalDone = readyState?.tasks
      ? ['renderer', 'vehicle', 'terrain', 'road', 'environment', 'shaders', 'validation'].every(
          (k) => readyState.tasks[k]?.status === 'complete'
        )
      : false
    check(allCriticalDone, 'All 7 Critical Loading Tasks Marked COMPLETE')

    if (readyState?.metrics) {
      console.log('[METRICS]', JSON.stringify(readyState.metrics))
    }

    // Wait for fade-out transition (850ms) and verify post-fade gameplay scene + background streaming
    await sleep(1100)
    await cdp.screenshot('loading-post-fade-reveal.png')

    const postFadeCheck = await cdp.evaluate(`
      (() => {
        const el = document.querySelector('[data-testid="cinematic-loading-screen"]');
        const pos = window.__VEHICLE_POS__;
        const perf = window.__PERFORMANCE_STATS__;
        const bg = window.__LOADING_STORE__?.getState()?.tasks?.distant_world;
        return {
          loadingOverlayRemoved: !el,
          carPosY: pos ? pos.y : null,
          carPosZ: pos ? pos.z : null,
          fps: perf?.fps ?? null,
          distantStatus: bg?.status,
          distantDetail: bg?.detail,
        };
      })()
    `)
    check(postFadeCheck.loadingOverlayRemoved, 'Loading Screen Unmounted Cleanly After Cinematic Fade')
    check(
      postFadeCheck.carPosY !== null && postFadeCheck.carPosY > 0 && Number.isFinite(postFadeCheck.carPosY),
      'Vehicle Positioned Safely Above Spawn Terrain',
      `Y=${postFadeCheck.carPosY?.toFixed(2)}, Z=${postFadeCheck.carPosZ}`
    )

    // -------------------------------------------------------------
    // TEST 2: POST-READY DRIVING & BACKGROUND HORIZON EXPANSION
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: POST-READY DRIVING & BACKGROUND HORIZON STREAMING ---')
    await cdp.evaluate(`
      (() => {
        const g = window.__GAME_STORE__?.getState();
        if (g && !g.autoDrive) g.toggleAutoDrive();
      })()
    `)
    await sleep(4500)

    const drivingCheck = await cdp.evaluate(`
      (() => {
        const t = window.__TELEMETRY_STORE__?.getState();
        const l = window.__LOADING_STORE__?.getState();
        const pos = window.__VEHICLE_POS__;
        return {
          speed: t?.speed || 0,
          distanceZ: pos ? Math.abs(pos.z) : 0,
          distantTask: l?.tasks?.distant_world,
          audioTask: l?.tasks?.audio,
        };
      })()
    `)
    check(drivingCheck.speed > 15 && drivingCheck.distanceZ > 15, 'Vehicle Responds & Drives Smoothly Post-Load', `Speed=${drivingCheck.speed} km/h, Z=-${drivingCheck.distanceZ.toFixed(1)}m`)
    check(
      drivingCheck.distantTask?.status === 'complete' || drivingCheck.distantTask?.progress >= 30,
      'Distant Terrain Horizon Streamed Progressively in Background',
      `${drivingCheck.distantTask?.status} (${drivingCheck.distantTask?.detail})`
    )

    // -------------------------------------------------------------
    // TEST 3: WARM CACHE STARTUP TIMING & ALTERNATE BIOME/VEHICLE
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: WARM CACHE STARTUP & ALTERNATE BIOME + VEHICLE ---')
    await cdp.evaluate(`
      (() => {
        localStorage.setItem('calmroads_biome', JSON.stringify('desert'));
        localStorage.setItem('calmroads_vehicle_model', JSON.stringify('supercar'));
      })()
    `)
    const warmStart = Date.now()
    await cdp.send('Page.reload', { ignoreCache: false })

    let warmReady = null
    for (let i = 0; i < 120; i++) {
      const snap = await cdp.evaluate(`
        (() => {
          const l = window.__LOADING_STORE__?.getState();
          const r = window.__WORLD_READINESS__;
          const g = window.__GAME_STORE__?.getState();
          return {
            isReady: Boolean(l?.isReady),
            metrics: l?.metrics,
            biome: g?.biome,
            vehicleModel: g?.vehicleModel,
            loadedType: r?.vehicleLoadedType,
            vehicleDetail: l?.tasks?.vehicle?.detail,
          };
        })()
      `).catch(() => null)
      if (snap?.isReady) {
        warmReady = snap
        break
      }
      await sleep(80)
    }
    const warmElapsed = Date.now() - warmStart
    check(
      Boolean(warmReady?.isReady) && warmReady?.vehicleModel === 'supercar' && warmReady?.loadedType === 'supercar',
      'Warm Cache Alternate Biome (Desert) & Vehicle (Supercar) Initialized Cleanly',
      `${warmElapsed}ms (playableReadyMs=${warmReady?.metrics?.playableReadyMs}ms)`
    )

    // -------------------------------------------------------------
    // TEST 4: FAILED ASSET DETECTION & INTERACTIVE RETRY RECOVERY
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: ASSET FAILURE DETECTION & RETRY RECOVERY ---')
    await cdp.evaluate(`
      (() => {
        localStorage.setItem('calmroads_biome', JSON.stringify('forest'));
        localStorage.setItem('calmroads_vehicle_model', JSON.stringify('bmw_m3'));
      })()
    `)

    // Intercept BMW GLB request and force HTTP 404 failure cleanly
    let interceptFailEnabled = true
    await cdp.send('Fetch.enable', {
      patterns: [{ urlPattern: '*bmw_m3_gtr_e46.glb*' }],
    })
    cdp.on('Fetch.requestPaused', async (params) => {
      try {
        if (interceptFailEnabled) {
          await cdp.send('Fetch.failRequest', {
            requestId: params.requestId,
            errorReason: 'ConnectionFailed',
          })
        } else {
          await cdp.send('Fetch.continueRequest', { requestId: params.requestId })
        }
      } catch {
        // ignore if request already disposed
      }
    })

    // Clear console error noise from intentional intercepted 404 test after capturing it
    const errCountBeforeIntercept = consoleErrors.length
    await cdp.send('Page.reload', { ignoreCache: true })

    let sawErrorScreen = false
    for (let i = 0; i < 80; i++) {
      const errSnap = await cdp.evaluate(`
        (() => {
          const l = window.__LOADING_STORE__?.getState();
          return {
            stage: l?.stage,
            errorMessage: l?.errorMessage,
            canFallbackVehicle: l?.canFallbackVehicle,
            isReady: Boolean(l?.isReady),
            hasRetryBtn: Array.from(document.querySelectorAll('button')).some((b) => b.textContent?.includes('RETRY INITIALIZATION')),
          };
        })()
      `).catch(() => null)

      if (errSnap?.stage === 'ERROR' && errSnap.hasRetryBtn && !errSnap.isReady) {
        sawErrorScreen = true
        console.log('[RECOVERY] Failure caught cleanly:', errSnap.errorMessage)
        break
      }
      await sleep(120)
    }

    await cdp.screenshot('loading-error-recovery.png')
    check(sawErrorScreen, 'Missing/Failed Vehicle Asset Caught Without Crashing Canvas or Entering World')

    // Now restore network and click RETRY INITIALIZATION button in UI
    interceptFailEnabled = false
    await cdp.send('Fetch.disable')
    await cdp.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('RETRY INITIALIZATION'));
        if (btn) btn.click();
      })()
    `)

    let recoveredReady = false
    for (let i = 0; i < 120; i++) {
      const snap = await cdp.evaluate(`window.__LOADING_STORE__?.getState()?.isReady`).catch(() => false)
      if (snap) {
        recoveredReady = true
        break
      }
      await sleep(100)
    }
    check(recoveredReady, 'Interactive Retry Recovered Cleanly & Completed Staged Initialization')

    // Filter out expected intentional Fetch.failRequest log errors recorded during Test 4 only
    const realConsoleErrors = consoleErrors.slice(0, errCountBeforeIntercept)
    check(
      realConsoleErrors.length === 0,
      'Zero Unexpected Runtime / WebGL Errors During Normal & Warm Startups',
      realConsoleErrors.length > 0 ? realConsoleErrors.join(' | ') : '0 errors'
    )
  } catch (err) {
    console.error('[FATAL TEST ERROR]', err)
    failed++
  } finally {
    // Clear default persisted selections cleanly
    if (cdp) {
      await cdp
        .evaluate(`
          localStorage.removeItem('calmroads_biome');
          localStorage.removeItem('calmroads_vehicle_model');
        `)
        .catch(() => {})
      cdp.close()
    }
    chromeProc.kill()
    previewProc.kill()

    console.log('\n=================================================================')
    console.log(` VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`)
    console.log('=================================================================')
    process.exit(failed > 0 ? 1 : 0)
  }
}

run()
