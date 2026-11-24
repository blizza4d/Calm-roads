// scripts/benchmark-deep-profile.mjs
// Deep Profiling and Baseline Measurement Script for Calm Roads
import { spawn } from 'child_process'
import http from 'http'
import fs from 'fs'
import path from 'path'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9240
const PREVIEW_PORT = 5190
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
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails))
    }
    return res.result?.value
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
  console.log(' CALM ROADS: DEEP PERFORMANCE PROFILING & BASELINE AUDIT ')
  console.log('===============================================================')

  const previewProc = spawn('npm', ['run', 'preview', '--', '--port', String(PREVIEW_PORT)], {
    shell: true,
    stdio: 'ignore',
  })

  const serverReady = await waitForServer(APP_URL)
  if (!serverReady) {
    console.error('Failed to start preview server!')
    previewProc.kill()
    process.exit(1)
  }

  const chromeUserData = path.join(ARTIFACTS_DIR, 'scratch_chrome_perf_profile')
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
    console.log('[CDP] Connected to Chrome.')

    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')

    const startupStart = Date.now()
    let readyTime = 0
    let stageHistory = []

    for (let i = 0; i < 100; i++) {
      const state = await cdp.evaluate(`
        (() => {
          const s = window.__LOADING_STORE__?.getState();
          return {
            stage: s?.stage,
            progress: s?.progress,
            isReady: s?.isReady,
            hasCanvas: Boolean(document.querySelector('canvas'))
          };
        })()
      `)

      if (state && (!stageHistory.length || stageHistory[stageHistory.length - 1].stage !== state.stage)) {
        const elapsed = Date.now() - startupStart
        stageHistory.push({ stage: state.stage, progress: state.progress, elapsedMs: elapsed })
        console.log(`[STARTUP] ${elapsed}ms -> Stage: ${state.stage} (${state.progress}%)`)
      }

      if (state?.isReady) {
        readyTime = Date.now() - startupStart
        break
      }
      await sleep(100)
    }

    console.log(`\n>>> TOTAL TIME TO FIRST PLAYABLE MOMENT: ${readyTime}ms <<<`)

    // Wait 2.0s for loading screen transition and initial stabilization
    await sleep(2000)

    // Collect Three.js Scene & Renderer Metrics
    const renderMetrics = await cdp.evaluate(`
      (() => {
        const perf = window.__PERFORMANCE_STATS__ || {};
        return {
          glInfo: {
            calls: perf.drawCalls,
            triangles: perf.triangles,
            geometries: perf.geometries,
            textures: perf.textures,
            shaderPrograms: perf.shaderPrograms,
            jsHeapMb: perf.jsHeapMb,
          },
          fps: perf.fps,
          frameTimeMs: perf.frameTimeMs,
          frameSpikeMs: perf.frameSpikeMs,
        };
      })()
    `)

    console.log('\n--- THREE.JS SCENE GRAPH & RENDERER AUDIT ---')
    console.log('Draw Calls per frame:    ', renderMetrics.glInfo?.calls ?? 'N/A')
    console.log('Triangles per frame:     ', renderMetrics.glInfo?.triangles?.toLocaleString() ?? 'N/A')
    console.log('GPU Geometries in memory:', renderMetrics.glInfo?.geometries ?? 'N/A')
    console.log('GPU Textures in memory:  ', renderMetrics.glInfo?.textures ?? 'N/A')
    console.log('Active Shader Programs:  ', renderMetrics.glInfo?.shaderPrograms ?? 'N/A')
    console.log('JS Heap Memory:          ', renderMetrics.glInfo?.jsHeapMb ?? 'N/A', 'MB')

    // Benchmark 120 frames stationary
    console.log('\n--- 120-FRAME RUNTIME BENCHMARK (STATIONARY) ---')
    const stationaryPerf = await cdp.evaluate(`
      new Promise((resolve) => {
        const frameTimes = [];
        let lastTime = performance.now();
        let framesCounted = 0;

        function onFrame(now) {
          const delta = Math.max(0.1, now - lastTime);
          lastTime = now;
          frameTimes.push(delta);
          framesCounted++;
          if (framesCounted < 120) {
            requestAnimationFrame(onFrame);
          } else {
            frameTimes.sort((a, b) => a - b);
            const sum = frameTimes.reduce((a, b) => a + b, 0);
            const avg = sum / frameTimes.length;
            const min = frameTimes[0];
            const max = frameTimes[frameTimes.length - 1];
            const p95 = frameTimes[Math.floor(frameTimes.length * 0.95)];
            const p99 = frameTimes[Math.floor(frameTimes.length * 0.99)];
            resolve({
              avgFps: 1000 / avg,
              avgFrameTime: avg,
              minFrameTime: min,
              maxFrameTime: max,
              p95FrameTime: p95,
              p99FrameTime: p99,
            });
          }
        }
        requestAnimationFrame(onFrame);
      })
    `)

    console.log(`Average FPS:         ${stationaryPerf.avgFps.toFixed(1)} FPS`)
    console.log(`Average Frame Time:  ${stationaryPerf.avgFrameTime.toFixed(2)} ms`)
    console.log(`Min Frame Time:      ${stationaryPerf.minFrameTime.toFixed(2)} ms`)
    console.log(`Max Frame Time:      ${stationaryPerf.maxFrameTime.toFixed(2)} ms`)
    console.log(`95th Percentile:     ${stationaryPerf.p95FrameTime.toFixed(2)} ms`)
    console.log(`99th Percentile:     ${stationaryPerf.p99FrameTime.toFixed(2)} ms`)

    // Benchmark 120 frames while accelerating / driving at speed
    console.log('\n--- 120-FRAME RUNTIME BENCHMARK (HIGH-SPEED DRIVING & CHUNK STREAMING) ---')
    // Set autoDrive or virtual throttle
    await cdp.evaluate(`
      (() => {
        const store = window.__GAME_STORE__?.getState();
        if (store) {
          if (!store.autoDrive) store.toggleAutoDrive();
        }
      })()
    `)
    // Drive for 2 seconds to reach high velocity
    await sleep(2000)

    const drivingPerf = await cdp.evaluate(`
      new Promise((resolve) => {
        const frameTimes = [];
        let lastTime = performance.now();
        let framesCounted = 0;

        function onFrame(now) {
          const delta = now - lastTime;
          lastTime = now;
          frameTimes.push(delta);
          framesCounted++;
          if (framesCounted < 120) {
            requestAnimationFrame(onFrame);
          } else {
            frameTimes.sort((a, b) => a - b);
            const sum = frameTimes.reduce((a, b) => a + b, 0);
            const avg = sum / frameTimes.length;
            const min = frameTimes[0];
            const max = frameTimes[frameTimes.length - 1];
            const p95 = frameTimes[Math.floor(frameTimes.length * 0.95)];
            const p99 = frameTimes[Math.floor(frameTimes.length * 0.99)];
            resolve({
              avgFps: 1000 / avg,
              avgFrameTime: avg,
              minFrameTime: min,
              maxFrameTime: max,
              p95FrameTime: p95,
              p99FrameTime: p99,
            });
          }
        }
        requestAnimationFrame(onFrame);
      })
    `)

    console.log(`Driving Avg FPS:     ${drivingPerf.avgFps.toFixed(1)} FPS`)
    console.log(`Driving Avg Frame:   ${drivingPerf.avgFrameTime.toFixed(2)} ms`)
    console.log(`Driving Max Spike:   ${drivingPerf.maxFrameTime.toFixed(2)} ms`)
    console.log(`Driving 95th %ile:   ${drivingPerf.p95FrameTime.toFixed(2)} ms`)
    console.log(`Driving 99th %ile:   ${drivingPerf.p99FrameTime.toFixed(2)} ms`)

    // Save baseline json for comparison
    const baselineResults = {
      startupTimeMs: readyTime,
      stageHistory,
      renderMetrics,
      stationaryPerf,
      drivingPerf,
      timestamp: new Date().toISOString(),
    }
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, 'baseline-profile-results.json'),
      JSON.stringify(baselineResults, null, 2)
    )
    console.log('\n[SAVED] Baseline profile written to baseline-profile-results.json')

  } catch (err) {
    console.error('[ERROR during profile]', err)
  } finally {
    if (cdp) cdp.close()
    chromeProc.kill()
    previewProc.kill()
  }
}

run()
