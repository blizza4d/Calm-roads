import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function inspect() {
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
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch('http://127.0.0.1:9222/json/version');
      if (res.ok) {
        const data = await res.json();
        wsUrl = data.webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
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

  const consoleLogs = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const resolve = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg);
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const args = msg.params.args.map(a => a.value !== undefined ? a.value : (a.description || '')).join(' ');
      consoleLogs.push(`[${msg.params.type}] ${args}`);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleLogs.push(`[EXCEPTION] ${msg.params.exceptionDetails.text} ${msg.params.exceptionDetails.exception?.description || ''}`);
    }
  };

  await new Promise(r => ws.onopen = r);

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: 'http://localhost:5173/' });

  console.log('Navigated, waiting 4s...');
  await new Promise(r => setTimeout(r, 4000));

  const evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const dbg = window.__CALM_DEBUG;
      if (!dbg) return { calmDebug: 'NOT ATTACHED (Experience not mounted or suspended)' };

      const { scene, camera, gl, performanceStats } = dbg;
      const objects = [];
      scene.traverse(obj => {
        if (obj.isMesh || obj.isPoints || obj.isLine) {
          objects.push({
            type: obj.type,
            name: obj.name,
            visible: obj.visible,
            pos: [Number(obj.position.x.toFixed(1)), Number(obj.position.y.toFixed(1)), Number(obj.position.z.toFixed(1))]
          });
        }
      });

      return {
        calmDebugAttached: true,
        camera: {
          pos: [Number(camera.position.x.toFixed(1)), Number(camera.position.y.toFixed(1)), Number(camera.position.z.toFixed(1))],
          rot: [Number(camera.rotation.x.toFixed(2)), Number(camera.rotation.y.toFixed(2)), Number(camera.rotation.z.toFixed(2))],
          near: camera.near,
          far: camera.far,
          fov: camera.fov
        },
        sceneBg: scene.background ? (scene.background.isColor ? scene.background.getHexString() : 'Texture') : null,
        sceneEnv: !!scene.environment,
        sceneFog: scene.fog ? { color: scene.fog.color.getHexString(), density: scene.fog.density } : null,
        renderCalls: gl.info.render.calls,
        renderTriangles: gl.info.render.triangles,
        perfStats: performanceStats,
        meshCount: objects.length,
        sampleMeshes: objects.slice(0, 15)
      };
    })()`,
    returnByValue: true
  });

  console.log('--- DIAGNOSTIC RESULT ---');
  console.log(JSON.stringify(evalRes?.result?.result?.value, null, 2));

  console.log('\n--- CONSOLE LOGS ---');
  consoleLogs.forEach(l => console.log(l));

  ws.close();
  chromeProcess.kill();
}

inspect().catch(console.error);
