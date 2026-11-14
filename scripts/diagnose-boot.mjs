import { spawn } from 'child_process'
import fs from 'fs'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

async function check() {
  const tmpDir = fs.mkdtempSync('C:\\Users\\Asus\\AppData\\Local\\Temp\\chrome-diag-')
  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9241',
    '--no-sandbox',
    '--disable-gpu',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--user-data-dir=' + tmpDir,
    '--window-size=1280,720',
    'about:blank',
  ])

  let wsUrl = null
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 200))
    try {
      const res = await fetch('http://127.0.0.1:9241/json/version')
      if (res.ok) {
        wsUrl = (await res.json()).webSocketDebuggerUrl
        break
      }
    } catch {}
  }

  const listRes = await fetch('http://127.0.0.1:9241/json/list')
  const tabs = await listRes.json()
  const pageTab = tabs.find((t) => t.type === 'page') || tabs[0]
  const ws = new WebSocket(pageTab.webSocketDebuggerUrl)

  let id = 1
  const pending = new Map()
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const curId = id++
      pending.set(curId, (res) => resolve(res.result || res))
      ws.send(JSON.stringify({ id: curId, method, params }))
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
      console.log(`[Browser Console ${msg.params.message.level}] ${msg.params.message.text}`)
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const args = msg.params.args.map((a) => a.value !== undefined ? a.value : (a.description || JSON.stringify(a))).join(' ')
      logs.push(`[Runtime ${msg.params.type}] ${args}`)
      console.log(`[Browser Log] ${args}`)
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const text = `${msg.params.exceptionDetails.text} ${msg.params.exceptionDetails.exception?.description || ''}`
      logs.push(`[EXCEPTION] ${text}`)
      console.log(`[Browser Exception] ${text}`)
    }
  }

  await new Promise((r) => (ws.onopen = r))
  await send('Page.enable')
  await send('Runtime.enable')

  console.log('Navigating...')
  await send('Page.navigate', { url: 'http://localhost:5173/' })

  for (let step = 1; step <= 25; step++) {
    await new Promise((r) => setTimeout(r, 400))
    const evalRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const lStore = window.__CALM_DEBUG?.useLoadingStore?.getState() || {};
        const gStore = window.__CALM_DEBUG?.useGameStore?.getState() || {};
        const dbg = window.__CALM_DEBUG || {};
        return {
          t: ${(step * 0.4).toFixed(1)},
          stage: lStore.stage,
          progress: lStore.progress,
          isReady: lStore.isReady,
          isWorldReady: gStore.isWorldReady,
          calls: dbg.gl?.info?.render?.calls,
          triangles: dbg.gl?.info?.render?.triangles
        };
      })()`,
      returnByValue: true,
    })

    const val = evalRes?.result?.value
    console.log(`Step ${step} (T=${(step * 0.4).toFixed(1)}s):`, val)
    if (val?.isReady) {
      console.log('>>> SCENE READY REACHED! <<<')
      break
    }
  }

  ws.close()
  chromeProcess.kill()
  try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
}

check().catch(console.error)
