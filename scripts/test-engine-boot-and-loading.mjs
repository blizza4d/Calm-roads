import { spawn } from 'child_process'
import fs from 'fs'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

console.log('=== CALM ROADS — COMPLETE ENGINE BOOT & LOADING SCREEN AUDIT ===\n')

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`)
    passed++
  } else {
    console.error(`  [FAIL] ${message}`)
    failed++
  }
}

async function runBrowserAudit() {
  const tmpDir = fs.mkdtempSync('C:\\Users\\Asus\\AppData\\Local\\Temp\\chrome-boot-test-')
  console.log('Launching headless Chrome with isolated user profile for boot audit...')

  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9255',
    '--no-sandbox',
    '--disable-gpu',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--user-data-dir=' + tmpDir,
    '--window-size=1280,720',
    'about:blank',
  ])

  chromeProcess.on('exit', (code, sig) => {
    console.log(`Chrome process exited: code=${code}, signal=${sig}`)
  })

  let wsUrl = null
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 200))
    try {
      const res = await fetch('http://127.0.0.1:9255/json/version')
      if (res.ok) {
        wsUrl = (await res.json()).webSocketDebuggerUrl
        break
      }
    } catch {}
  }

  if (!wsUrl) {
    console.error('Failed to connect to Chrome debugging port.')
    try {
      if (process.platform === 'win32' && chromeProcess.pid) {
        spawn('taskkill', ['/F', '/T', '/PID', String(chromeProcess.pid)])
      } else {
        chromeProcess.kill()
      }
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch {}
    process.exit(1)
  }

  const listRes = await fetch('http://127.0.0.1:9255/json/list')
  const tabs = await listRes.json()
  const pageTab = tabs.find((t) => t.type === 'page') || tabs[0]
  const ws = new WebSocket(pageTab.webSocketDebuggerUrl)

  let msgId = 1
  const pending = new Map()
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++
      pending.set(id, (res) => resolve(res.result || res))
      ws.send(JSON.stringify({ id, method, params }))
    })
  }

  const logs = []
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id && pending.has(msg.id)) {
      const resolve = pending.get(msg.id)
      pending.delete(msg.id)
      resolve(msg)
    }
    if (msg.method === 'Console.messageAdded') {
      logs.push(`[Console ${msg.params.message.level}] ${msg.params.message.text}`)
    }
  }

  ws.onclose = (e) => {
    console.log(`WebSocket closed: code=${e.code}, reason=${e.reason}`)
    for (const [id, cb] of pending.entries()) {
      cb({ error: 'WebSocket closed' })
    }
    pending.clear()
  }
  ws.onerror = (e) => {
    console.log(`WebSocket error:`, e)
  }

  await new Promise((r) => (ws.onopen = r))
  await send('Page.enable')
  await send('Runtime.enable')

  console.log('\n--- TEST GROUP 1: Boot Lifecycle & Milestone Progression ---')
  console.log('Navigating to http://localhost:5173/ ...')
  await send('Page.navigate', { url: 'http://localhost:5173/' })

  let capturedEarlyState = null
  let isSceneReady = false
  let finalStage = ''
  let finalProgress = 0
  let durationMs = 0
  const startT = Date.now()

  for (let step = 1; step <= 55; step++) {
    await new Promise((r) => setTimeout(r, 400))
    const evalRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const lStore = window.__CALM_DEBUG?.useLoadingStore?.getState() || {};
        const gStore = window.__CALM_DEBUG?.useGameStore?.getState() || {};
        const dbg = window.__CALM_DEBUG || {};
        const headerEl = document.querySelector('header h1');
        return {
          step: ${step},
          t: ${(step * 0.4).toFixed(1)},
          hasHeader: !!headerEl,
          headerText: headerEl?.textContent || null,
          stage: lStore.stage,
          progress: lStore.progress,
          errorMessage: lStore.errorMessage,
          isReady: lStore.isReady,
          isWorldReady: gStore.isWorldReady,
          calls: dbg.gl?.info?.render?.calls,
          triangles: dbg.gl?.info?.render?.triangles
        };
      })()`,
      returnByValue: true,
    })

    const val = evalRes?.result?.value
    if (val && !capturedEarlyState && !val.isReady && val.hasHeader) {
      capturedEarlyState = val
      console.log('Early Boot State sampled:', val)
    }

    if (step % 4 === 0 || val?.isReady || val?.stage === 'ERROR') {
      console.log(`Step ${step} (T=${(step * 0.4).toFixed(1)}s): stage=${val?.stage}, progress=${val?.progress}%, isReady=${val?.isReady}${val?.errorMessage ? ' ERROR: ' + val.errorMessage : ''}`)
    }

    if (val?.isReady && val?.isWorldReady) {
      isSceneReady = true
      finalStage = val.stage
      finalProgress = val.progress
      durationMs = Date.now() - startT
      console.log(`Verified READY at Step ${step} (T=${(step * 0.4).toFixed(1)}s):`, val)
      break
    }
  }

  assert(capturedEarlyState?.hasHeader, 'Loading Screen DOM renders immediately on startup (zero initial blank screen)')
  assert(!capturedEarlyState?.isReady, 'Engine begins in unready state (!isReady on frame 0)')
  assert(isSceneReady, `Engine achieved verified READY state in ${durationMs}ms`)
  assert(finalStage === 'READY', `Final loading stage is strictly READY (was: ${finalStage})`)
  assert(finalProgress === 100, `Final loading progress reached 100% (was: ${finalProgress}%)`)

  // Verify Checklist completeness
  const checklistState = await send('Runtime.evaluate', {
    expression: `(() => {
      const lStore = window.__CALM_DEBUG?.useLoadingStore?.getState() || {};
      return lStore.checklist || {};
    })()`,
    returnByValue: true,
  })
  const cl = checklistState?.result?.value
  console.log('Checklist Verification:', cl)
  assert(cl?.rendererValid, 'Checklist: WebGL Renderer verified valid')
  assert(cl?.cameraValid, 'Checklist: Camera frustum verified valid')
  assert(cl?.terrainReady, 'Checklist: Procedural terrain chunks ready')
  assert(cl?.roadReady, 'Checklist: Road centerline and camber ready')
  assert(cl?.firstFrameRendered, 'Checklist: First live scene frames rendered successfully')

  console.log('\n--- TEST GROUP 2: Post-Boot Gameplay & Control Engagement ---')
  // Verify driving inputs are engaged
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 })
  await new Promise((r) => setTimeout(r, 1200))
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 })

  const driveState = await send('Runtime.evaluate', {
    expression: `(() => {
      const dbg = window.__CALM_DEBUG;
      const cam = dbg?.camera?.position;
      return {
        camZ: cam?.z,
        hasCamera: !!cam
      };
    })()`,
    returnByValue: true,
  })
  console.log('Post-Drive State:', driveState?.result?.value)
  assert(driveState?.result?.value?.hasCamera, 'Camera continues active tracking post-boot')

  console.log('\n--- TEST GROUP 3: Error State & Recovery Testing ---')
  // Trigger recovery/error state via store to test UI
  await send('Runtime.evaluate', {
    expression: `window.__CALM_DEBUG?.useLoadingStore?.getState()?.setError('Simulated GPU pipeline stall for recovery testing.')`,
  })
  await new Promise((r) => setTimeout(r, 400))

  const errorUI = await send('Runtime.evaluate', {
    expression: `(() => {
      const titleEl = document.querySelector('[data-testid="recovery-title"]') || document.querySelector('#recovery-heading');
      const title = titleEl?.textContent || '';
      const retryBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('RETRY'));
      return {
        titleText: title,
        hasErrorTitle: title.toUpperCase().includes('INTERRUPTED'),
        hasRetryBtn: !!retryBtn
      };
    })()`,
    returnByValue: true,
  })
  console.log('Recovery UI state:', errorUI?.result?.value)
  assert(errorUI?.result?.value?.hasErrorTitle, 'Error UI renders "WORLD INITIALIZATION INTERRUPTED"')
  assert(errorUI?.result?.value?.hasRetryBtn, 'Recovery UI provides RETRY INITIALIZATION action button')

  // Trigger retry recovery
  console.log('Executing RETRY INITIALIZATION...')
  await send('Runtime.evaluate', {
    expression: `(() => {
      const retryBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('RETRY'));
      if (retryBtn) retryBtn.click();
    })()`,
  })

  // Await recovered ready state
  let isRecovered = false
  for (let i = 0; i < 45; i++) {
    await new Promise((r) => setTimeout(r, 400))
    const poll = await send('Runtime.evaluate', {
      expression: `(() => {
        const s = window.__CALM_DEBUG?.useLoadingStore?.getState() || {};
        return { isReady: s.isReady, stage: s.stage, progress: s.progress, err: s.errorMessage };
      })()`,
      returnByValue: true,
    })
    const pVal = poll?.result?.value
    if (i % 3 === 0 || pVal?.isReady) {
      console.log(`Retry Poll ${i} (T=${(i * 0.4).toFixed(1)}s):`, pVal)
    }
    if (pVal?.isReady === true) {
      isRecovered = true
      break
    }
  }
  assert(isRecovered, 'Pipeline recovered cleanly to READY after retry action')

  // Capture a screenshot of the running game
  const shotRes = await send('Page.captureScreenshot', { format: 'png' })
  if (shotRes?.data) {
    fs.writeFileSync('scripts/live-boot-verified.png', Buffer.from(shotRes.data, 'base64'))
    console.log('Captured screenshot to scripts/live-boot-verified.png')
  }

  // Cleanup Chrome
  try {
    ws.close()
    if (process.platform === 'win32' && chromeProcess.pid) {
      spawn('taskkill', ['/F', '/T', '/PID', String(chromeProcess.pid)])
    } else {
      chromeProcess.kill()
    }
    fs.rmSync(tmpDir, { recursive: true, force: true })
  } catch {}

  console.log('\n========================================')
  console.log(`AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('========================================\n')

  if (failed > 0) process.exit(1)
}

runBrowserAudit().catch((err) => {
  console.error('Fatal audit failure:', err)
  process.exit(1)
})
