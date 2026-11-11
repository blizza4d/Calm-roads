import { spawn } from 'child_process';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  console.log('Launching headless Chrome for full verification...');
  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--no-sandbox',
    '--disable-gpu',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--window-size=1280,720',
    'about:blank'
  ]);

  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const res = await fetch('http://127.0.0.1:9222/json/version');
      if (res.ok) {
        const data = await res.json();
        wsUrl = data.webSocketDebuggerUrl;
        console.log('Connected to Chrome CDP:', wsUrl);
        break;
      }
    } catch (e) {}
  }

  if (!wsUrl) {
    console.error('Failed to connect to Chrome debugging port.');
    chromeProcess.kill();
    process.exit(1);
  }

  const listRes = await fetch('http://127.0.0.1:9222/json/list');
  const tabs = await listRes.json();
  const pageTab = tabs.find(t => t.type === 'page') || tabs[0];
  const tabWsUrl = pageTab.webSocketDebuggerUrl;

  const ws = new WebSocket(tabWsUrl);

  let msgId = 1;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  const logs = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const resolve = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg);
    }
    if (msg.method === 'Console.messageAdded') {
      logs.push(`[Console ${msg.params.message.level}] ${msg.params.message.text}`);
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const args = msg.params.args.map(a => a.value !== undefined ? a.value : (a.description || JSON.stringify(a))).join(' ');
      logs.push(`[Runtime ${msg.params.type}] ${args}`);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      logs.push(`[EXCEPTION] ${msg.params.exceptionDetails.text} ${msg.params.exceptionDetails.exception?.description || ''}`);
    }
  };

  await new Promise(r => ws.onopen = r);

  await send('Console.enable');
  await send('Runtime.enable');
  await send('Page.enable');

  console.log('Navigating to http://localhost:5173/ ...');
  await send('Page.navigate', { url: 'http://localhost:5173/' });

  // Wait 4 seconds for instant startup
  console.log('Waiting 4s for instant startup...');
  await new Promise(r => setTimeout(r, 4000));

  // Evaluate DOM and WebGL Canvas
  const initialEval = await send('Runtime.evaluate', {
    expression: `(() => {
      try {
        const canvas = document.querySelector('canvas');
        const loader = document.querySelector('div[class*="z-50"]');
        const hud = document.querySelector('[data-testid="racing-speedometer"]') || document.querySelector('svg');
        const diagOverlay = document.querySelector('div[data-testid="dev-diagnostics"]') || document.body.innerText.includes('DIAGNOSTICS');

        let pixelSky = null;
        let pixelCenter = null;
        let pixelRoad = null;

        if (canvas) {
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          if (gl) {
            const readPx = (x, y) => {
              const px = new Uint8Array(4);
              gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
              return Array.from(px);
            };
            pixelSky = readPx(Math.floor(canvas.width / 2), Math.floor(canvas.height * 0.85));
            pixelCenter = readPx(Math.floor(canvas.width / 2), Math.floor(canvas.height * 0.5));
            pixelRoad = readPx(Math.floor(canvas.width / 2), Math.floor(canvas.height * 0.15));
          }
        }

        return {
          title: document.title,
          canvasFound: !!canvas,
          canvasDimensions: canvas ? { width: canvas.width, height: canvas.height, clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight } : null,
          hasBlockingLoader: !!loader,
          hasHUD: !!hud,
          pixelSky,
          pixelCenter,
          pixelRoad,
          bodySnippet: document.body.innerText.slice(0, 300)
        };
      } catch (err) {
        return { error: err.message, stack: err.stack };
      }
    })()`,
    returnByValue: true
  });

  console.log('\n=== INITIAL LOAD VERIFICATION ===');
  console.log(JSON.stringify(initialEval?.result?.result?.value, null, 2));

  // Dispatch F3 key event to open development diagnostics
  console.log('\nTriggering F3 to toggle diagnostics...');
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'F3', code: 'F3', windowsVirtualKeyCode: 114 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'F3', code: 'F3', windowsVirtualKeyCode: 114 });
  await new Promise(r => setTimeout(r, 500));

  // Simulate driving forward for 2.5 seconds
  console.log('\nSimulating driving forward (ArrowUp keydown for 2.5s)...');
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
  await new Promise(r => setTimeout(r, 2500));
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });

  // Evaluate driving and diagnostic state
  const drivingEval = await send('Runtime.evaluate', {
    expression: `(() => {
      try {
        const speedText = Array.from(document.querySelectorAll('*')).find(el => el.textContent && /\\d+\\s*(KM\\/H|MPH)/i.test(el.textContent))?.textContent;
        return {
          speedIndicator: speedText || 'Not found',
          fullPageSnippet: document.body.innerText.slice(0, 500)
        };
      } catch (e) {
        return { error: e.message };
      }
    })()`,
    returnByValue: true
  });

  console.log('\n=== DRIVING EVALUATION ===');
  console.log(JSON.stringify(drivingEval?.result?.result?.value, null, 2));

  // Capture screenshot of the rendered 3D world
  const screenshotRes = await send('Page.captureScreenshot', { format: 'png' });
  if (screenshotRes?.data) {
    fs.writeFileSync('scripts/recovered-world.png', Buffer.from(screenshotRes.data, 'base64'));
    console.log('\nScreenshot successfully saved to scripts/recovered-world.png (' + Math.round(screenshotRes.data.length * 0.75 / 1024) + ' KB)');
  }

  console.log('\n=== BROWSER LOGS SUMMARY ===');
  const errorLogs = logs.filter(l => l.includes('error') || l.includes('Error') || l.includes('EXCEPTION') || l.includes('Failed'));
  console.log(`Total logs: ${logs.length}, Errors/Exceptions: ${errorLogs.length}`);
  if (errorLogs.length > 0) {
    console.log('Error logs:');
    errorLogs.forEach(l => console.log('  ', l));
  }
  console.log('\nSample logs:');
  logs.slice(-15).forEach(l => console.log('  ', l));

  ws.close();
  chromeProcess.kill();
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
