import { spawn } from 'child_process';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testFlicker() {
  const tmpDir = fs.mkdtempSync('C:\\Users\\Asus\\AppData\\Local\\Temp\\chrome-flicker-audit-');
  console.log('Launching Chrome to audit 120 consecutive frames for black flickering...');

  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9231',
    '--no-sandbox',
    '--disable-gpu',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--user-data-dir=' + tmpDir,
    '--window-size=1280,720',
    'http://localhost:5173/'
  ]);

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch('http://127.0.0.1:9231/json/version');
      if (res.ok) {
        wsUrl = (await res.json()).webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  const list = await (await fetch('http://127.0.0.1:9231/json/list')).json();
  const ws = new WebSocket(list[0].webSocketDebuggerUrl);

  let msgId = 1;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise(res => {
      const curId = id++;
      pending.set(curId, r => res(r.result || r));
      ws.send(JSON.stringify({ id: curId, method, params }));
    });
  }
  let id = 1;

  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
    }
  };

  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Runtime.enable');
  await new Promise(r => setTimeout(r, 4000));

  console.log('Driving forward while monitoring 90 consecutive frames for black pixels...');

  // Start driving
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });

  const result = await send('Runtime.evaluate', {
    expression: `new Promise(resolve => {
      const canvas = document.querySelector('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const frames = [];
      let count = 0;

      function checkFrame() {
        count++;
        // Sample 5 points across the canvas (avoiding center where black spoiler is)
        const pts = [
          [canvas.width * 0.15, canvas.height * 0.25], // top-left sky
          [canvas.width * 0.85, canvas.height * 0.25], // top-right sky
          [canvas.width * 0.15, canvas.height * 0.75], // bottom-left ground
          [canvas.width * 0.85, canvas.height * 0.75], // bottom-right ground
          [canvas.width * 0.50, canvas.height * 0.15], // top-center sky
        ];
        let nonBlack = 0;
        const buf = new Uint8Array(4);
        for (const [x, y] of pts) {
          gl.readPixels(Math.floor(x), Math.floor(y), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
          if (buf[0] > 15 || buf[1] > 15 || buf[2] > 20) {
            nonBlack++;
          }
        }
        const isBlackFrame = (nonBlack === 0);
        frames.push({ frame: count, nonBlack, isBlackFrame });

        if (count < 90) {
          requestAnimationFrame(checkFrame);
        } else {
          resolve(frames);
        }
      }

      requestAnimationFrame(checkFrame);
    })`,
    returnByValue: true,
    awaitPromise: true
  });

  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });

  console.log('Evaluation result:', result);
  const frames = Array.isArray(result?.result?.value) ? result.result.value : [];
  const blackFrames = frames.filter(f => f.isBlackFrame);

  console.log(`Audited ${frames.length} frames.`);
  console.log(`Black frames detected: ${blackFrames.length} / ${frames.length}`);
  if (blackFrames.length > 0) {
    console.log('Black frame indices:', blackFrames.map(f => f.frame).join(', '));
  }

  chromeProcess.kill();
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
}

testFlicker();
