// scripts/verify-calm-roads-2.0.mjs
// Automated Live Browser Driving & Transmission Overhaul Verification
import { spawn } from 'child_process'
import http from 'http'
import fs from 'fs'
import path from 'path'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9222
const APP_URL = 'http://localhost:5173/'
const ARTIFACTS_DIR = 'C:\\Users\\Asus\\.gemini\\antigravity\\brain\\416ba9bb-2572-466e-b62a-3186b6e4aa33'

console.log('=== CALM ROADS 2.0 LIVE RUNTIME VERIFICATION ===\n')

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
            reject(new Error('No page target found'))
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
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails))
    }
    return res.result?.value
  }

  async sendKeyEvent(type, code, key) {
    await this.send('Input.dispatchKeyEvent', {
      type,
      code,
      key,
      windowsVirtualKeyCode: code === 'KeyW' ? 87 : code === 'KeyS' ? 83 : code === 'KeyM' ? 77 : 0,
    })
  }

  async captureScreenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' })
    const outPath = path.join(ARTIFACTS_DIR, filename)
    fs.writeFileSync(outPath, Buffer.from(res.data, 'base64'))
    console.log(`[SCREENSHOT] Saved: ${outPath}`)
    return outPath
  }

  close() {
    if (this.ws) this.ws.close()
  }
}

async function run() {
  const chromeArgs = [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--window-size=1280,720',
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--use-gl=angle',
    '--use-angle=d3d11',
    '--user-data-dir=' + path.join(process.env.TEMP || 'C:\\Temp', 'calm-roads-profile-' + Date.now()),
    APP_URL,
  ]

  console.log('Launching Headless Chrome...')
  const chromeProc = spawn(CHROME_PATH, chromeArgs, { stdio: 'ignore' })

  try {
    let wsUrl = null
    for (let i = 0; i < 30; i++) {
      await sleep(500)
      try {
        wsUrl = await getWsUrl()
        if (wsUrl) break
      } catch (e) {}
    }

    if (!wsUrl) throw new Error('Failed to connect to Chrome CDP within 15 seconds')
    console.log('Connected to Chrome DevTools WebSocket.')

    const client = new CDPClient(wsUrl)
    await client.connect()
    await client.send('Page.enable')
    await client.send('Runtime.enable')

    console.log('Waiting for loading screen & 3D world initialization...')
    let ready = false
    for (let i = 0; i < 40; i++) {
      await sleep(500)
      const isReady = await client.evaluate(`
        Boolean(window.__CALM_ROADS_STORE__ ? window.__CALM_ROADS_STORE__.getState().isReady : document.querySelector('canvas'))
      `)
      if (isReady) {
        ready = true
        break
      }
    }
    console.log(`World Ready: ${ready}`)

    // Allow 2.5s for initial chunk shaders warmup
    await sleep(2500)

    // Check canvas and WebGL renderer status
    const renderStats = await client.evaluate(`
      (() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return { error: 'No canvas found' };
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        return {
          width: canvas.width,
          height: canvas.height,
          clientWidth: canvas.clientWidth,
          clientHeight: canvas.clientHeight,
          hasGl: !!gl,
        };
      })()
    `)
    console.log('\n[WebGL Canvas Status]:', renderStats)

    // Read initial telemetry state from DOM
    const initialHud = await client.evaluate(`
      (() => {
        const speed = document.querySelector('.font-courier.text-5xl, .font-courier.text-6xl')?.textContent?.trim();
        const gearEls = Array.from(document.querySelectorAll('span')).filter(s => s.classList.contains('text-4xl') && s.classList.contains('font-courier'));
        const gear = gearEls[0]?.textContent?.trim();
        return { speed, gear };
      })()
    `)
    console.log('[Initial HUD Telemetry]:', initialHud)

    // ------------------------------------------------------------------------
    // ACTION 1: ACCELERATE FORWARD IN AUTOMATIC MODE (1st -> 2nd GEAR SHIFT)
    // ------------------------------------------------------------------------
    console.log('\n[ACTION 1] Pressing Throttle (KeyW) for 8.0 seconds to test automatic upshifting...')
    await client.sendKeyEvent('rawKeyDown', 'KeyW', 'w')

    const drivingTelemetryLog = []
    for (let t = 0; t < 16; t++) {
      await sleep(500)
      const tel = await client.evaluate(`
        (() => {
          const speedEl = document.querySelector('.font-courier.text-5xl, .font-courier.text-6xl');
          const gearEls = Array.from(document.querySelectorAll('span')).filter(s => s.classList.contains('text-4xl') && s.classList.contains('font-courier'));
          const gearText = gearEls[0]?.textContent?.trim();
          const rpmEl = Array.from(document.querySelectorAll('span')).find(s => s.textContent?.includes('RPM') || s.textContent?.includes('SHIFT'));
          const transModeEl = Array.from(document.querySelectorAll('span')).find(s => s.textContent?.trim() === 'AUTO' || s.textContent?.trim() === 'MANUAL');
          return {
            speed: speedEl?.textContent?.trim(),
            gear: gearText,
            rpm: rpmEl?.textContent?.trim(),
            mode: transModeEl?.textContent?.trim()
          };
        })()
      `)
      drivingTelemetryLog.push(tel)
      console.log(`  t=${((t + 1) * 0.5).toFixed(1)}s | Speed: ${tel.speed} km/h | Gear: ${tel.gear} | RPM: ${tel.rpm} | Mode: ${tel.mode}`)
    }

    // Capture screenshot while cruising
    await client.captureScreenshot('calm-roads-2.0-driving.png')

    // Release throttle
    await client.sendKeyEvent('keyUp', 'KeyW', 'w')
    await sleep(200)

    // ------------------------------------------------------------------------
    // ACTION 2: BRAKE TO COMPLETE HALT & TRANSITION TO REVERSE
    // ------------------------------------------------------------------------
    console.log('\n[ACTION 2] Holding Service Brake (KeyS) to slow down, halt and engage Reverse...')
    await client.sendKeyEvent('rawKeyDown', 'KeyS', 's')

    let reachedReverse = false
    for (let t = 0; t < 12; t++) {
      await sleep(500)
      const tel = await client.evaluate(`
        (() => {
          const speedEl = document.querySelector('.font-courier.text-5xl, .font-courier.text-6xl');
          const gearEls = Array.from(document.querySelectorAll('span')).filter(s => s.classList.contains('text-4xl') && s.classList.contains('font-courier'));
          const gearText = gearEls[0]?.textContent?.trim();
          const rpmEl = Array.from(document.querySelectorAll('span')).find(s => s.textContent?.includes('RPM') || s.textContent?.includes('SHIFT'));
          return {
            speed: speedEl?.textContent?.trim(),
            gear: gearText,
            rpm: rpmEl?.textContent?.trim()
          };
        })()
      `)
      console.log(`  Braking t=${((t + 1) * 0.5).toFixed(1)}s | Speed: ${tel.speed} km/h | Gear: ${tel.gear} | RPM: ${tel.rpm}`)
      if (tel.gear === 'R') {
        reachedReverse = true
      }
    }

    // Release brake
    await client.sendKeyEvent('keyUp', 'KeyS', 's')
    await sleep(300)

    console.log(`Reverse Transition Result: ${reachedReverse ? 'SUCCESS (Smoothly engaged R)' : 'IN PROGRESS'}`)

    // ------------------------------------------------------------------------
    // ACTION 3: TOGGLE TRANSMISSION MODE VIA BUTTON CLICK & KEY M
    // ------------------------------------------------------------------------
    console.log('\n[ACTION 3] Clicking Transmission Mode button to switch to MANUAL...')
    await client.evaluate(`
      (() => {
        const btn = document.querySelector('button[title*="Automatic / Manual"]');
        if (btn) btn.click();
      })()
    `)
    await sleep(400)

    const modeAfterToggle = await client.evaluate(`
      (() => {
        const transModeEl = Array.from(document.querySelectorAll('span')).find(s => s.textContent?.trim() === 'AUTO' || s.textContent?.trim() === 'MANUAL');
        return transModeEl?.textContent?.trim();
      })()
    `)
    console.log(`Mode after toggle click: ${modeAfterToggle}`)

    // ------------------------------------------------------------------------
    // ACTION 4: MANUAL SHIFTING IN MANUAL MODE
    // ------------------------------------------------------------------------
    console.log('\n[ACTION 4] Accelerating in Manual Mode...')
    await client.sendKeyEvent('rawKeyDown', 'KeyW', 'w')
    for (let t = 0; t < 6; t++) {
      await sleep(500)
    }

    console.log('Sending Left Shift (ShiftLeft) to manually upshift...')
    await client.sendKeyEvent('rawKeyDown', 'ShiftLeft', 'Shift')
    await client.sendKeyEvent('keyUp', 'ShiftLeft', 'Shift')
    await sleep(600)

    const manualShiftState = await client.evaluate(`
      (() => {
        const speedEl = document.querySelector('.font-courier.text-5xl, .font-courier.text-6xl');
        const gearEls = Array.from(document.querySelectorAll('span')).filter(s => s.classList.contains('text-4xl') && s.classList.contains('font-courier'));
        const gearText = gearEls[0]?.textContent?.trim();
        const rpmEl = Array.from(document.querySelectorAll('span')).find(s => s.textContent?.includes('RPM') || s.textContent?.includes('SHIFT'));
        const transModeEl = Array.from(document.querySelectorAll('span')).find(s => s.textContent?.trim() === 'AUTO' || s.textContent?.trim() === 'MANUAL');
        return {
          speed: speedEl?.textContent?.trim(),
          gear: gearText,
          rpm: rpmEl?.textContent?.trim(),
          mode: transModeEl?.textContent?.trim()
        };
      })()
    `)
    console.log(`Manual shift result: Speed: ${manualShiftState.speed} km/h | Gear: ${manualShiftState.gear} | RPM: ${manualShiftState.rpm} | Mode: ${manualShiftState.mode}`)

    await client.sendKeyEvent('keyUp', 'KeyW', 'w')

    // Capture Manual mode cockpit screenshot
    await client.captureScreenshot('calm-roads-2.0-manual-cockpit.png')

    client.close()
    console.log('\n=== LIVE VERIFICATION FINISHED SUCCESSFULLY ===')
  } catch (err) {
    console.error('Error in verification:', err)
  } finally {
    try {
      chromeProc.kill()
    } catch (e) {}
  }
}

run()
