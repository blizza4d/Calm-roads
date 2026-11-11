import { spawn } from 'child_process';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  const tmpDir = fs.mkdtempSync('C:\\Users\\Asus\\AppData\\Local\\Temp\\chrome-test-');
  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--no-sandbox',
    '--disable-gpu',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--user-data-dir=' + tmpDir,
    '--window-size=1280,720',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    'http://localhost:5173/'
  ]);

  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 300));
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
    chromeProcess.kill();
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
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Runtime.enable');

  console.log('Waiting 5s for full scene initialization...');
  await new Promise(r => setTimeout(r, 5000));

  const debugEval = await send('Runtime.evaluate', {
    expression: `(() => {
      const dbg = window.__CALM_DEBUG;
      if (!dbg) return { error: 'No __CALM_DEBUG' };
      const { gl, scene, camera, performanceStats } = dbg;

      // Count types of objects in scene
      const objectCounts = {};
      let meshCount = 0;
      let totalTriangles = 0;
      let lightCount = 0;

      scene.traverse((obj) => {
        const type = obj.type || 'Unknown';
        objectCounts[type] = (objectCounts[type] || 0) + 1;
        if (obj.isMesh) {
          meshCount++;
          if (obj.geometry && obj.geometry.index) {
            totalTriangles += obj.geometry.index.count / 3;
          } else if (obj.geometry && obj.geometry.attributes.position) {
            totalTriangles += obj.geometry.attributes.position.count / 3;
          }
        }
        if (obj.isLight) lightCount++;
      });

      return {
        hasGL: !!gl,
        camera: {
          position: [camera.position.x, camera.position.y, camera.position.z],
          fov: camera.fov,
          near: camera.near,
          far: camera.far
        },
        sceneSummary: {
          childrenCount: scene.children.length,
          meshCount,
          lightCount,
          totalTriangles: Math.round(totalTriangles),
          objectCounts
        },
        stats: performanceStats
      };
    })()`,
    returnByValue: true
  });

  console.log('\n=== 3D SCENE AUDIT ===');
  console.log(JSON.stringify(debugEval?.result?.result?.value, null, 2));

  // Take screenshot with Page.captureScreenshot
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const base64Data = shot?.result?.data;
  if (base64Data) {
    fs.writeFileSync('scripts/recovered-world.png', Buffer.from(base64Data, 'base64'));
    console.log('Saved scripts/recovered-world.png (' + Math.round(base64Data.length * 0.75 / 1024) + ' KB)');
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
