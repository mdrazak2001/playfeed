(() => {
  const script = document.currentScript;
  if (!(script instanceof HTMLScriptElement)) return;

  const origin = new URL(script.src, window.location.href).origin;
  const STYLE_ID = "playfeed-bubble-style";

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .pf-bubble {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 999999;
        width: 56px;
        height: 56px;
        border: 0;
        border-radius: 999px;
        background: #111827;
        color: #fff;
        font-size: 24px;
        cursor: grab;
        box-shadow: 0 10px 30px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.08);
        animation: pf-bubble-pulse 2.4s ease-in-out infinite;
      }
      .pf-bubble:active { cursor: grabbing; transform: scale(.97); }
      .pf-panel {
        position: fixed;
        right: 16px;
        bottom: 80px;
        z-index: 999999;
        width: min(380px, calc(100vw - 24px));
        height: min(640px, 78vh);
        overflow: hidden;
        border-radius: 22px;
        background: #0b1220;
        box-shadow: 0 24px 80px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.08);
      }
      .pf-panel[hidden] { display: none !important; }
      .pf-panel-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 48px;
        padding: 0 14px 0 16px;
        color: #f8fafc;
        font: 700 13px/1 ui-sans-serif, system-ui, sans-serif;
        letter-spacing: .08em;
        text-transform: uppercase;
        background: #111827;
      }
      .pf-close {
        width: 32px;
        height: 32px;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: #e2e8f0;
        font-size: 22px;
        cursor: pointer;
      }
      .pf-panel iframe {
        width: 100%;
        height: calc(100% - 48px);
        border: 0;
        background: #030712;
      }
      @keyframes pf-bubble-pulse {
        0%, 100% { box-shadow: 0 10px 30px rgba(0,0,0,.35), 0 0 0 0 rgba(216,255,70,.45); }
        50% { box-shadow: 0 10px 30px rgba(0,0,0,.35), 0 0 0 10px rgba(216,255,70,0); }
      }
    `;
    document.head.appendChild(style);
  }

  const launcher = document.createElement("button");
  launcher.type = "button";
  launcher.className = "pf-bubble";
  launcher.setAttribute("aria-label", "Open Playfeed");
  launcher.textContent = "🎮";

  const panel = document.createElement("div");
  panel.className = "pf-panel";
  panel.hidden = true;
  panel.innerHTML =
    '<div class="pf-panel-bar"><span>Playfeed</span><button type="button" class="pf-close" aria-label="Close Playfeed">&times;</button></div><iframe title="Playfeed games" allow="fullscreen"></iframe>';

  const iframe = panel.querySelector("iframe");
  const close = panel.querySelector(".pf-close");
  if (!(iframe instanceof HTMLIFrameElement) || !(close instanceof HTMLButtonElement)) return;

  const open = () => {
    panel.hidden = false;
    iframe.src = `${origin}/?embed=1`;
  };

  const shut = () => {
    panel.hidden = true;
    iframe.src = "";
  };

  let dragMoved = false;
  let pointerId = 0;
  let startX = 0;
  let startY = 0;
  let originRight = 16;
  let originBottom = 16;

  launcher.addEventListener("pointerdown", (event) => {
    dragMoved = false;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    originRight = Number.parseFloat(launcher.style.right || "16");
    originBottom = Number.parseFloat(launcher.style.bottom || "16");
    launcher.setPointerCapture(event.pointerId);
  });

  launcher.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId || !launcher.hasPointerCapture(pointerId)) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.hypot(dx, dy) > 6) dragMoved = true;
    launcher.style.right = `${Math.max(8, originRight - dx)}px`;
    launcher.style.bottom = `${Math.max(8, originBottom - dy)}px`;
    panel.style.right = launcher.style.right;
    panel.style.bottom = `${Number.parseFloat(launcher.style.bottom) + 64}px`;
  });

  launcher.addEventListener("pointerup", (event) => {
    if (event.pointerId === pointerId) launcher.releasePointerCapture(pointerId);
    if (dragMoved) return;
    if (panel.hidden) open();
    else shut();
  });

  close.addEventListener("click", shut);
  document.body.append(panel, launcher);
})();
