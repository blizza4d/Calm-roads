import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  const tmpDir = fs.mkdtempSync('C:\\Users\\Asus\\AppData\\Local\\Temp\\chrome-diag-');
  console.log('Launching isolated Chrome CDP with temp profile:', tmpDir);

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
        console.log('Connected to Chrome CDP:', wsUrl);
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

  await send('Console.enable');
  await send('Runtime.enable');
  await send('Page.enable');

  console.log('Navigating to http://localhost:5173/ ...');
  await send('Page.navigate', { url: 'http://localhost:5173/' });

  // Wait 4 seconds for instant startup
  console.log('Waiting 4s for instant scene startup...');
  await new Promise(r => setTimeout(r, 4000));

  const diagEval = await send('Runtime.evaluate', {
    expression: `(() => {
      try {
        const canvas = document.querySelector('canvas');
        const loader = document.querySelector('div[class*="z-50"]');
        const dbg = window.__CALM_DEBUG;

        let meshCount = 0;
        let totalTriangles = 0;
        let objectTypes = {};

        if (dbg && dbg.scene) {
          dbg.scene.traverse((obj) => {
            objectTypes[obj.type] = (objectTypes[obj.type] || 0) + 1;
            if (obj.isMesh) {
              meshCount++;
              if (obj.geometry && obj.geometry.index) {
                totalTriangles += obj.geometry.index.count / 3;
              } else if (obj.geometry && obj.geometry.attributes && obj.geometry.attributes.position) {
                totalTriangles += obj.geometry.attributes.position.count / 3;
              }
            }
          });
        }

        const hudElements = {
          speedometer: !!document.querySelector('[data-testid="racing-speedometer"]') || !!document.querySelector('svg'),
          destinations: !!document.body.innerText.includes('DESTINATIONS') || !!document.body.innerText.includes('DESTINATION ARRIVAL'),
          gear: !!document.body.innerText.includes('GEAR'),
          diagnosticsOverlay: !!document.body.innerText.includes('DIAGNOSTICS')
        };

        return {
          title: document.title,
          canvasFound: !!canvas,
          canvasSize: canvas ? { width: canvas.width, height: canvas.height } : null,
          blockingLoaderFound: !!loader,
          hasCalmDebug: !!dbg,
          cameraPos: dbg?.camera?.position ? [
            +dbg.camera.position.x.toFixed(2),
            +dbg.camera.position.y.toFixed(2),
            +dbg.camera.position.z.toFixed(2)
          ] : null,
          sceneStats: {
            meshCount,
            totalTriangles: Math.round(totalTriangles),
            objectTypes
          },
          hudElements,
          performanceStats: dbg?.performanceStats || null
        };
      } catch (err) {
        return { error: err.message, stack: err.stack };
      }
    })()`,
    returnByValue: true
  });

  console.log('\n=== LIVE APPLICATION DIAGNOSTICS ===');
  console.log(JSON.stringify(diagEval?.result?.value, null, 2));

  // Capture screenshot
  const screenshotRes = await send('Page.captureScreenshot', { format: 'png' });
  const rawData = screenshotRes?.data || screenshotRes?.result?.data;
  if (rawData) {
    const outPath = path.resolve('scripts/live-restored-game.png');
    fs.writeFileSync(outPath, Buffer.from(rawData, 'base64'));
    console.log(`\nScreenshot saved: ${outPath} (${Math.round(rawData.length * 0.75 / 1024)} KB)`);
  } else {
    console.log('Failed to capture screenshot data:', JSON.stringify(screenshotRes));
  }

  console.log(`\n=== BROWSER LOGS (${logs.length}) ===`);
  const errs = logs.filter(l => /error|exception/i.test(l));
  console.log(`Errors found: ${errs.length}`);
  if (errs.length > 0) {
    errs.forEach(e => console.log('  ', e));
  }

  ws.close();
  chromeProcess.kill();
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
