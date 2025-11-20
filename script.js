const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");
const tooltip = document.getElementById("tooltip");

const k = 9e9;
const scale = 50;
const centralCharge = { x: 0, y: 0, q: 1 };

let charges = [];
let selectedCharge = null;
let offsetX = 0, offsetY = 0;

const chargeList = document.getElementById("chargeList");
const resultsDiv = document.getElementById("results");

// === Agregar carga ===
document.getElementById("addCharge").addEventListener("click", () => {
  if (charges.length >= 5) {
    return alert("Máximo 5 cargas permitidas");
  }

  const type = document.getElementById("chargeType").value;
  const magnitude = parseFloat(document.getElementById("chargeValue").value);
  if (isNaN(magnitude)) return alert("Ingresa una magnitud válida");
  const q = type === "positive" ? magnitude : -magnitude;

  // Generar posiciones aleatorias dentro de los límites
  const newCharge = {
    x: parseFloat((Math.random() * 16 - 8).toFixed(1)), // Entre -8 y 8
    y: parseFloat((Math.random() * 10 - 5).toFixed(1)), // Entre -5 y 5
    q
  };

  charges.push(newCharge);
  updateChargeList();
  draw();
});

// === Limpiar todo ===
document.getElementById("clearAll").addEventListener("click", () => {
  charges = [];
  updateChargeList();
  draw();
});

// === Actualizar lista de cargas ===
function updateChargeList() {
  chargeList.innerHTML = "";
  charges.forEach((c, i) => {
    const div = document.createElement("div");
    div.className = "charge-item";

    div.innerHTML = `
      <b>Carga ${i + 1}</b>
      <button class="delete-btn" data-index="${i}">❌</button>
      <label>Tipo: ${c.q > 0 ? "Positiva (+)" : "Negativa (-)"}</label>
      <label>X: <input type="number" step="0.1" min="-8" max="8" value="${c.x.toFixed(2)}" data-index="${i}" data-attr="x" title="Valor entre -8 y 8"></label>
      <label>Y: <input type="number" step="0.1" min="-5" max="5" value="${c.y.toFixed(2)}" data-index="${i}" data-attr="y" title="Valor entre -5 y 5"></label>
      <label>Magnitud (C): <input type="number" step="0.1" value="${(c.q).toFixed(2)}" data-index="${i}" data-attr="q"></label>
    `;
    chargeList.appendChild(div);
  });

  // Inputs dinámicos
  document.querySelectorAll(".charge-item input").forEach(input => {
    input.addEventListener("input", (e) => {
      const idx = e.target.dataset.index;
      const attr = e.target.dataset.attr;
      let value = parseFloat(e.target.value);

      // Validar y ajustar automáticamente los límites para X e Y
      if (attr === "x") {
        if (value < -8) value = -8;
        if (value > 8) value = 8;
        charges[idx][attr] = value;
        e.target.value = value.toFixed(2); // Actualizar input con valor corregido
      } else if (attr === "y") {
        if (value < -5) value = -5;
        if (value > 5) value = 5;
        charges[idx][attr] = value;
        e.target.value = value.toFixed(2); // Actualizar input con valor corregido
      } else if (attr === "q") {
        // Permitir cambio de signo correctamente
        if (e.target.value === "" || e.target.value === "-") {
          // Estado temporal mientras el usuario escribe
          return;
        }

        let numValue = parseFloat(e.target.value);
        if (!isNaN(numValue)) {
          charges[idx].q = numValue;
          e.target.value = numValue.toString(); // Mantener el formato
        }
      }

      updateChargeList();
      draw();
    });

    // También validar en el evento change (por si pegan valores o usan las flechas)
    input.addEventListener("change", (e) => {
      const idx = e.target.dataset.index;
      const attr = e.target.dataset.attr;
      let value = parseFloat(e.target.value);

      if (attr === "x") {
        if (value < -8) value = -8;
        if (value > 8) value = 8;
        charges[idx][attr] = value;
        e.target.value = value.toFixed(2);
      } else if (attr === "y") {
        if (value < -5) value = -5;
        if (value > 5) value = 5;
        charges[idx][attr] = value;
        e.target.value = value.toFixed(2);
      }

      // Solo redibujar si hubo cambio
      if (attr === "x" || attr === "y") draw();
    });
  });

  // Botones de eliminar
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = e.target.dataset.index;
      charges.splice(idx, 1);
      updateChargeList();
      draw();
    });
  });
}

// === Dibujo principal ===
// Helper: formatea a notación científica tipo 3.02×10<sup>-4</sup>
function formatSci(num, fractionDigits = 2) {
  if (!isFinite(num)) return String(num);
  if (num === 0) return "0";

  const s = num.toExponential(fractionDigits); // ej "3.02e-4"
  const [mantissa, expStr] = s.split('e');
  const exp = parseInt(expStr, 10);

  return `${mantissa} \\times 10^${exp}`;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  let totalFx = 0, totalFy = 0;
  let resultsHTML = "";

  // === Por cada carga: dibujar y calcular contribución ===
  charges.forEach((charge, i) => {
    const px = cx + charge.x * scale;
    const py = cy - charge.y * scale;

    // Línea discontinua hacia la carga
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.strokeStyle = "#aaa";
    ctx.stroke();
    ctx.setLineDash([]);

    // Dibuja carga
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, 2 * Math.PI);
    ctx.fillStyle = charge.q > 0 ? "red" : "blue";
    ctx.fill();

    // === Cálculos ===
    const dx = centralCharge.x - charge.x; // vector desde la carga fuente hacia el centro
    const dy = centralCharge.y - charge.y;
    const r = Math.sqrt(dx ** 2 + dy ** 2);
    if (r < 1e-9) {
      resultsHTML += `<p style="margin: 0.5rem 0;">$\\vec{F}_${i + 1} =$ Indefinida $(r = 0)$</p>`;
      return;
    }

    // Módulo escalar
    const Fm = k * Math.abs(centralCharge.q * charge.q) / (r ** 2);

    // Componentes vectoriales correctas (para sumar y obtener la resultante)
    const Fx = k * centralCharge.q * charge.q * dx / Math.pow(r, 3);
    const Fy = k * centralCharge.q * charge.q * dy / Math.pow(r, 3);

    totalFx += Fx;
    totalFy += Fy;

    const tipo = (centralCharge.q * charge.q > 0) ? "Repulsión" : "Atracción";

    // Dibuja flecha indicativa (dirección de la fuerza sobre la carga central)
    const arrowColor = tipo === "Repulsión" ? "red" : "blue";
    const arrowScale = 0.4 * scale;
    // Normalizamos (uso Fx/Fm, Fy/Fm) y adaptamos signo Y para canvas
    drawArrow(px, py, (Fx / Fm) * arrowScale, -(Fy / Fm) * arrowScale, arrowColor);

    // Mostrar datos por carga en notación científica
    resultsHTML += `<p style="margin: 0.5rem 0;">$\\vec{F}_${i + 1} = ${formatSci(Fm)} N$ (${tipo})</p>`;
    resultsHTML += `<p style="margin: 0.25rem 0;">$\\vec{F}_x = ${formatSci(Fx)} N$</p> <p style="margin: 0.25rem 0;">$\\vec{F}_y = ${formatSci(Fy)} N$</p><br>`;
  });

  // === Dibuja la carga central ===
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, 2 * Math.PI);
  ctx.fillStyle = centralCharge.q > 0 ? "red" : "blue";
  ctx.fill();

  // === Fuerza total (suma vectorial) ===
  const F_total = Math.sqrt(totalFx ** 2 + totalFy ** 2);
  const angleRad = Math.atan2(totalFy, totalFx); // en radianes, respecto +x
  const angleDeg = angleRad * 180 / Math.PI;

  resultsHTML += `<hr><p style="margin: 0.5rem 0; margin-top: 1rem;"><b>Fuerza Total</b><br></p>`;
  resultsHTML += `<p style="margin: 0.25rem 0;">$F_{Total} = ${formatSci(F_total)} N$</p>`;
  resultsHTML += `<p style="margin: 0.25rem 0;">$\\vec{F_x} = ${formatSci(totalFx)} N$</p>`;
  resultsHTML += `<p style="margin: 0.25rem 0;">$\\vec{F_y} = ${formatSci(totalFy)} N$</p>`;
  resultsHTML += `<p style="margin: 0.25rem 0;">Ángulo = ${angleDeg.toFixed(2)}° respecto a $+x$<br></p>`;

  // === Dibujar flecha neta en el origen (verde) ===
  if (F_total > 0) {
    const netArrowScale = 0.6 * scale; // longitud visual fija (se ve la dirección)
    const dxNet = (totalFx / F_total) * netArrowScale;
    const dyNet = -(totalFy / F_total) * netArrowScale; // invertir para canvas
    drawArrow(cx, cy, dxNet, dyNet, "green");
  }

  // Renderiza HTML con <sup>
  resultsDiv.innerHTML = resultsHTML;

  // === RENDERIZAR LATEX CON MATHJAX ===
  if (window.MathJax) {
    MathJax.typesetPromise([resultsDiv]).catch(err => {
      console.error('Error rendering MathJax:', err);
    });
  }
}

// === Dibuja flecha ===
function drawArrow(x, y, dx, dy, color) {
  const angle = Math.atan2(dy, dx);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx, y + dy);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  const head = 8;
  ctx.beginPath();
  ctx.moveTo(x + dx, y + dy);
  ctx.lineTo(x + dx - head * Math.cos(angle - Math.PI / 6),
             y + dy - head * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x + dx - head * Math.cos(angle + Math.PI / 6),
             y + dy - head * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function getPointerPos(e, canvas) {
  debugger;
  const rect = canvas.getBoundingClientRect();
  let x, y;

  if (e.touches && e.touches.length > 0) {
    x = e.touches[0].clientX;
    y = e.touches[0].clientY;
  } else {
    x = e.clientX;
    y = e.clientY;
  }

  return {
    x: x - rect.left,
    y: y - rect.top
  };
}

function pointerStart(e) {
  e.preventDefault();
  const { x: mx, y: my } = getPointerPos(e, canvas);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  for (let i = 0; i < charges.length; i++) {
    const px = cx + charges[i].x * scale;
    const py = cy - charges[i].y * scale;
    if (Math.hypot(mx - px, my - py) < 10) {
      selectedCharge = i;
      offsetX = (mx - px) / scale;
      offsetY = -(my - py) / scale;
      break;
    }
  }
}

canvas.addEventListener("mousedown", pointerStart);
canvas.addEventListener("touchstart", pointerStart, { passive: false });

function pointerMove(e) {
  // ❗ Bloquear el scroll cuando se arrastra una carga en móvil
  if (e.touches) {
    e.preventDefault();
  }

  const { x: mx, y: my } = getPointerPos(e, canvas);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // Tooltip (solo en mouse)
  if (!e.touches) {
    let hovered = false;
    for (let i = 0; i < charges.length; i++) {
      const c = charges[i];
      const px = cx + c.x * scale;
      const py = cy - c.y * scale;
      if (Math.hypot(mx - px, my - py) < 12) {
        tooltip.style.display = "block";
        tooltip.style.left = `${e.clientX}px`;
        tooltip.style.top = `${e.clientY}px`;
        tooltip.innerText = `Carga ${i + 1}: ${c.q > 0 ? "Positiva" : "Negativa"}\nMagnitud: ${Math.abs(c.q).toFixed(2)} C`;
        tooltip.style.backgroundColor = c.q > 0 ? "rgba(255,0,0,0.8)" : "rgba(0,0,255,0.8)";
        hovered = true;
        break;
      }
    }
    if (!hovered) tooltip.style.display = "none";
  }

  if (selectedCharge !== null) {
    let newX = (mx - cx) / scale - offsetX;
    let newY = -(my - cy) / scale - offsetY;

    if (newX < -8) newX = -8;
    if (newX > 8) newX = 8;
    if (newY < -5) newY = -5;
    if (newY > 5) newY = 5;

    charges[selectedCharge].x = newX;
    charges[selectedCharge].y = newY;
    updateChargeList();
    draw();
  }
}

canvas.addEventListener("mousemove", pointerMove);
canvas.addEventListener("touchmove", pointerMove, { passive: false });

function pointerEnd() {
  selectedCharge = null;
  tooltip.style.display = "none";
}

canvas.addEventListener("mouseup", pointerEnd);
canvas.addEventListener("mouseleave", pointerEnd);
canvas.addEventListener("touchend", pointerEnd, { passive: false });
canvas.addEventListener("touchcancel", pointerEnd, { passive: false });

draw();