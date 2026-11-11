import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  const tmpDir = fs.mkdtempSync('C:\\Users\\Asus\\AppData\\Local\\Temp\\chrome-verify-fast-');
  console.log('Launching isolated Chrome CDP for complete verification...');

  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--no-sandbox',
    '--disable-gpu',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--user-data-dir=' + tmpDir,
    '--window-size=1280,720',
    'about:blank'
  ]);

  let wsUrl = null;
  for (let i = 0; i < 25; i++) {
    await new Promise(r => setTimeout(r, 250));
    try {
      const res = await fetch('http://127.0.0.1:9222/json/version');
      if (res.ok) {
        const data = await res.json();
        wsUrl = data.webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  if (!wsUrl) {
    console.error('Failed to connect to Chrome debugging port.');
    chromeProcess.kill();
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
    process.exit(1);
  }

  const listRes = await fetch('http://127.0.0.1:9222/json/list');
  const tabs = await listRes.json();
  const pageTab = tabs.find(t => t.type === 'page') || tabs[0];
  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, (res) => resolve(res.result || res));
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
  await send('Page.enable');
  await send('Runtime.enable');

  console.log('Navigating to http://localhost:5173/ ...');
  await send('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise(r => setTimeout(r, 4000));

  async function evalState(label) {
    const res = await send('Runtime.evaluate', {
      expression: `(() => {
        const dbg = window.__CALM_DEBUG;
        if (!dbg) return { error: 'No debug bridge' };
        const canvas = document.querySelector('canvas');
        let px = null;
        if (canvas) {
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          if (gl) {
            const arr = new Uint8Array(4);
            gl.readPixels(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, arr);
            px = Array.from(arr);
          }
        }
        return {
          label: '${label}',
          calls: dbg.gl?.info?.render?.calls || 0,
          triangles: dbg.gl?.info?.render?.triangles || 0,
          camPos: dbg.camera?.position ? [
            +dbg.camera.position.x.toFixed(1),
            +dbg.camera.position.y.toFixed(1),
            +dbg.camera.position.z.toFixed(1)
          ] : null,
          activeBiome: dbg.useGameStore?.getState()?.currentResolvedBiome,
          centerPixel: px
        };
      })()`,
      returnByValue: true
    });
    const d = res?.result?.value;
    console.log(`  [${label}] Calls: ${d?.calls} | Triangles: ${d?.triangles} | Cam: ${JSON.stringify(d?.camPos)} | Biome: ${d?.activeBiome} | CenterPx: ${JSON.stringify(d?.centerPixel)}`);
    return d;
  }

  console.log('\n=== STEP 1: INITIAL STARTUP AUDIT ===');
  await evalState('Fresh Startup');

  console.log('\n=== STEP 2: DRIVING FORWARD ===');
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
  await new Promise(r => setTimeout(r, 1500));
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
  await new Promise(r => setTimeout(r, 400));
  await evalState('After Driving');

  console.log('\n=== STEP 3: CAMERA PERSPECTIVES ===');
  for (const mode of ['chase', 'dashboard', 'bumper', 'drone']) {
    await send('Runtime.evaluate', {
      expression: `window.__CALM_DEBUG?.useGameStore?.getState()?.setCameraPerspective('${mode}')`
    });
    await new Promise(r => setTimeout(r, 400));
    await evalState(`Camera ${mode}`);
  }

  // Switch back to chase camera
  await send('Runtime.evaluate', {
    expression: `window.__CALM_DEBUG?.useGameStore?.getState()?.setCameraPerspective('chase')`
  });

  console.log('\n=== STEP 4: ALL BIOMES TRAVEL ===');
  const biomes = ['desert', 'plains', 'forest', 'twisted_mountains', 'alpine', 'coastal', 'autumn'];
  for (const b of biomes) {
    await send('Runtime.evaluate', {
      expression: `window.__CALM_DEBUG?.useGameStore?.getState()?.replaceActiveBiome('${b}')`
    });
    await new Promise(r => setTimeout(r, 1400));
    await evalState(`Biome: ${b}`);
  }

  console.log('\n=== STEP 5: WEATHER & TIME OF DAY ===');
  for (const w of ['rain', 'snow', 'clear']) {
    await send('Runtime.evaluate', {
      expression: `window.__CALM_DEBUG?.useGameStore?.getState()?.setWeather('${w}')`
    });
    await new Promise(r => setTimeout(r, 800));
    await evalState(`Weather: ${w}`);
  }

  for (const t of [{ n: 'sunset', v: 18.0 }, { n: 'night', v: 0.5 }, { n: 'day', v: 12.0 }]) {
    await send('Runtime.evaluate', {
      expression: `window.__CALM_DEBUG?.useGameStore?.getState()?.setTimeOfDay(${t.v})`
    });
    await new Promise(r => setTimeout(r, 800));
    await evalState(`Time: ${t.n}`);
  }

  console.log('\n=== STEP 6: SCREENSHOT CAPTURE & PIXEL DENSITY CHECK ===');
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const rawData = shot?.data || shot?.result?.data;
  if (rawData) {
    fs.writeFileSync('scripts/live-restored-game.png', Buffer.from(rawData, 'base64'));
    console.log(`Saved screenshot to scripts/live-restored-game.png (${Math.round(rawData.length * 0.75 / 1024)} KB)`);

    const pxAnalysis = await send('Runtime.evaluate', {
      expression: `new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = img.width;
          c.height = img.height;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);

          const midData = ctx.getImageData(300, 150, 600, 350).data;
          let nonBlackCount = 0;
          let totalCount = (600 * 350);
          for (let i = 0; i < midData.length; i += 4) {
            if (midData[i] > 20 || midData[i+1] > 20 || midData[i+2] > 25) {
              nonBlackCount++;
            }
          }
          resolve({
            width: img.width,
            height: img.height,
            visiblePercentage: ((nonBlackCount / totalCount) * 100).toFixed(2) + '%'
          });
        };
        img.src = 'data:image/png;base64,' + '${rawData}';
      })`,
      awaitPromise: true,
      returnByValue: true
    });
    console.log('Final Viewport Pixel Analysis:', JSON.stringify(pxAnalysis?.result?.value, null, 2));
  }

  console.log(`\n=== BROWSER CONSOLE ERRORS ===`);
  const errs = logs.filter(l => /error|exception/i.test(l));
  console.log(`Total Errors: ${errs.length}`);
  if (errs.length > 0) errs.forEach(e => console.log('  ', e));

  ws.close();
  chromeProcess.kill();
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
