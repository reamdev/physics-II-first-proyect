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
  const type = document.getElementById("chargeType").value;
  const magnitude = parseFloat(document.getElementById("chargeValue").value);
  if (isNaN(magnitude)) return alert("Ingresa una magnitud válida");
  const q = type === "positive" ? magnitude : -magnitude;
  const newCharge = { x: Math.random() * 6 - 3, y: Math.random() * 4 - 2, q };
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
    console.log(c.q);

    div.innerHTML = `
      <b>Carga ${i + 1}</b>
      <button class="delete-btn" data-index="${i}">❌</button>
      <label>Tipo: ${c.q > 0 ? "Positiva (+)" : "Negativa (-)"}</label>
      <label>X: <input type="number" step="0.1" value="${c.x.toFixed(2)}" data-index="${i}" data-attr="x"></label>
      <label>Y: <input type="number" step="0.1" value="${c.y.toFixed(2)}" data-index="${i}" data-attr="y"></label>
      <label>Magnitud (C): <input type="number" step="0.1" value="${(c.q).toFixed(2)}" data-index="${i}" data-attr="q"></label>
    `;
    chargeList.appendChild(div);
  });

  // Inputs dinámicos
  document.querySelectorAll(".charge-item input").forEach(input => {
    input.addEventListener("input", (e) => {
      const idx = e.target.dataset.index;
      const attr = e.target.dataset.attr;
      const value = parseFloat(e.target.value);

      if (attr === "x" || attr === "y") charges[idx][attr] = value;
      if (attr === "q") charges[idx].q = Math.sign(charges[idx].q) * value;
      updateChargeList();
      draw();
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
  return `${mantissa}×10<sup>${exp}</sup>`;
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
      resultsHTML += `<b>F${i + 1}</b>: Indefinida (r = 0)<br>`;
      return;
    }

    // Módulo escalar
    const Fm = k * Math.abs(centralCharge.q * charge.q) / (r ** 2);

    // Componentes vectoriales correctas (para sumar y obtener la resultante)
    const Fx = k * centralCharge.q * charge.q * dx / Math.pow(r, 3);
    const Fy = k * centralCharge.q * charge.q * dy / Math.pow(r, 3);

    console.log(`Fuerza X: ${Fx}`);
    console.log(`Fuerza Y: ${Fy}`);

    totalFx += Fx;
    totalFy += Fy;

    const tipo = (centralCharge.q * charge.q > 0) ? "Repulsión" : "Atracción";

    // Dibuja flecha indicativa (dirección de la fuerza sobre la carga central)
    const arrowColor = tipo === "Repulsión" ? "red" : "blue";
    const arrowScale = 0.4 * scale;
    // Normalizamos (uso Fx/Fm, Fy/Fm) y adaptamos signo Y para canvas
    drawArrow(px, py, (Fx / Fm) * arrowScale, -(Fy / Fm) * arrowScale, arrowColor);

    // Mostrar datos por carga en notación científica
    resultsHTML += `<b>F${i + 1}</b>: ${formatSci(Fm)} N (${tipo})<br>`;
    resultsHTML += `Fx = ${formatSci(Fx)} N<br>Fy = ${formatSci(Fy)} N<br><br>`;
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

  resultsHTML += `<hr><b>Fuerza Total</b><br>`;
  resultsHTML += `Fx = ${formatSci(totalFx)} N<br>`;
  resultsHTML += `Fy = ${formatSci(totalFy)} N<br>`;
  resultsHTML += `|F| = ${formatSci(F_total)} N<br>`;
  resultsHTML += `Ángulo = ${angleDeg.toFixed(2)}° respecto a +x<br>`;

  // === Dibujar flecha neta en el origen (verde) ===
  if (F_total > 0) {
    const netArrowScale = 0.6 * scale; // longitud visual fija (se ve la dirección)
    const dxNet = (totalFx / F_total) * netArrowScale;
    const dyNet = -(totalFy / F_total) * netArrowScale; // invertir para canvas
    drawArrow(cx, cy, dxNet, dyNet, "green");
  }

  // Renderiza HTML con <sup>
  resultsDiv.innerHTML = resultsHTML;
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

// === Movimiento con mouse ===
canvas.addEventListener("mousedown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
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
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // Tooltip dinámico
  let hovered = false;
  for (const c of charges) {
    const px = cx + c.x * scale;
    const py = cy - c.y * scale;
    if (Math.hypot(mx - px, my - py) < 12) {
      tooltip.style.display = "block";
      tooltip.style.left = `${e.clientX}px`;
      tooltip.style.top = `${e.clientY}px`;
      tooltip.innerText = c.q > 0 ? "Carga Positiva (+)" : "Carga Negativa (-)";
      tooltip.style.backgroundColor = c.q > 0 ? "rgba(255,0,0,0.8)" : "rgba(0,0,255,0.8)";
      hovered = true;
      break;
    }
  }
  if (!hovered) tooltip.style.display = "none";

  // Movimiento y actualización en vivo
  if (selectedCharge !== null) {
    charges[selectedCharge].x = (mx - cx) / scale - offsetX;
    charges[selectedCharge].y = -(my - cy) / scale - offsetY;
    updateChargeList();
    draw(); // 🔥 ahora recalcula y redibuja todo mientras mueves
  }
});

canvas.addEventListener("mouseup", () => selectedCharge = null);
canvas.addEventListener("mouseleave", () => {
  selectedCharge = null;
  tooltip.style.display = "none";
});

draw();