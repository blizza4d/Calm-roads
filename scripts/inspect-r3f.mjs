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

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const resolve = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg);
    }
  };

  await new Promise(r => ws.onopen = r);

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: 'http://localhost:5173/' });

  console.log('Navigated, waiting 5s...');
  await new Promise(r => setTimeout(r, 5000));

  const evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      try {
        const canvas = document.querySelector('canvas');
        if (!canvas) return { error: 'No canvas found' };
        const fiberKey = Object.keys(canvas).find(k => k.startsWith('__reactFiber'));
        const fiber = canvas[fiberKey];
        
        // Find R3F root or state
        let curr = fiber;
        let r3fState = null;
        while (curr) {
          if (curr.memoizedState && curr.memoizedState.store) {
            r3fState = curr.memoizedState.store.getState();
            break;
          }
          if (curr.stateNode && curr.stateNode.__r3f) {
            r3fState = curr.stateNode.__r3f;
            break;
          }
          curr = curr.return;
        }

        return {
          fiberFound: !!fiber,
          r3fStateFound: !!r3fState,
          cameraPos: r3fState?.camera?.position ? [r3fState.camera.position.x, r3fState.camera.position.y, r3fState.camera.position.z] : null,
          sceneChildrenCount: r3fState?.scene?.children ? r3fState.scene.children.length : null,
          sceneChildrenTypes: r3fState?.scene?.children ? r3fState.scene.children.map(c => c.type) : null
        };
      } catch (err) {
        return { error: err.message, stack: err.stack };
      }
    })()`,
    returnByValue: true
  });

  console.log('--- THREE.JS / R3F STATE ---');
  console.log(JSON.stringify(evalRes?.result?.result?.value, null, 2));

  ws.close();
  chromeProcess.kill();
}

inspect().catch(console.error);
