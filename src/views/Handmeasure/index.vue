<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";

// ─── Konstantalar ────────────────────────────────────────────────────
const MAX_M  = 10;
const GRID   = 60;   // px = 1 metr (ko'rish uchun grid)
const PAD    = 80;   // canvas padding
const CANVAS_SIZE = MAX_M * GRID + PAD * 2; // 760px
const DISCOUNT = { issiq: 0.07, sovuq: 0.06 } as const;

// ─── Turlar ──────────────────────────────────────────────────────────
type Season = "issiq" | "sovuq";
type Tool   = "room" | "korp" | "peregorodka" | "select";
type PDir   = "horizontal" | "vertical";

interface Korp {
  id: string; name: string;
  rx: number; ry: number; // px, xona ichidagi offset
  w: number;  h: number;  // px
}

interface Peregorodka {
  id: string; name: string;
  dir: PDir;
  pos: number; // px, xona ichidagi offset
}

interface Room {
  id: string; name: string;
  // Canvas koordinatalari (px)
  cx: number; cy: number; cw: number; ch: number;
  korplar: Korp[];
  peregorodkalar: Peregorodka[];
}

// ─── State ───────────────────────────────────────────────────────────
const canvasRef = ref<HTMLCanvasElement | null>(null);
const season    = ref<Season>("issiq");
const tool      = ref<Tool>("room");
const room      = ref<Room | null>(null);
const pDir      = ref<PDir>("horizontal");

// Drag
const dragging  = ref(false);
const dragStart = ref<{ x: number; y: number } | null>(null);
const dragRect  = ref<{ x: number; y: number; w: number; h: number } | null>(null);
const dragLine  = ref<number | null>(null);

// Modal
const modal        = ref<{ type: "room" | "korp" | "peregorodka"; name: string } | null>(null);
const pendingRoom  = ref<{ cx: number; cy: number; cw: number; ch: number } | null>(null);
const pendingKorp  = ref<{ rx: number; ry: number; w: number; h: number } | null>(null);
const pendingPPos  = ref<number>(0);

// Tanlangan
const selKorpId = ref<string | null>(null);
const selPerId  = ref<string | null>(null);

// Sichqoncha pozitsiyasi (xona koordinatalarida, metrda)
const mousePos = ref<{ x: number; y: number; inRoom: boolean } | null>(null);

// ─── Computed ────────────────────────────────────────────────────────
const D = computed(() => DISCOUNT[season.value]);

// px → metr (aniq, snap yo'q)
function pxToM(px: number): number { return px / GRID; }
function fmtM(px: number): string  { return pxToM(px).toFixed(2); }

const stats = computed(() => {
  const r = room.value;
  if (!r) return null;
  const d = D.value;

  const wM = pxToM(r.cw), hM = pxToM(r.ch);
  const totalM2 = wM * hM;
  const korpM2  = r.korplar.reduce((s, k) => s + pxToM(k.w) * pxToM(k.h), 0);
  const cleanM2 = totalM2 - korpM2;
  const matW    = wM * (1 - d), matH = hM * (1 - d);
  const baseMat = matW * matH;
  const korpMat = r.korplar.reduce((s, k) => s + pxToM(k.w)*(1-d) * pxToM(k.h)*(1-d), 0);
  const perMat  = r.peregorodkalar.reduce((s, p) => {
    const len = p.dir === "horizontal" ? wM : hM;
    return s + len * (1 - d) * 2;
  }, 0);
  const netMat = baseMat - korpMat + perMat;

  const korpDetails = r.korplar.map(k => {
    const kxM = pxToM(k.rx), kyM = pxToM(k.ry);
    const kwM = pxToM(k.w),  khM = pxToM(k.h);
    // Material devor chegaralari: har tomondan wM*d/2 ichkariga kiradi
    const mLeft   = wM * d / 2;
    const mTop    = hM * d / 2;
    const mRight  = wM * (1 - d / 2);
    const mBottom = hM * (1 - d / 2);
    // Korp o'zi ham material hisobida siqiladi (issiq/sovuq ta'siri)
    const kMatW = kwM * (1 - d);
    const kMatH = khM * (1 - d);
    // Korp material koordinatadagi chap-yuqori burchagi:
    // xona devoridan kxM metr, material devor esa mLeft dan boshlanadi
    // shuning uchun: material devoridan = kxM - mLeft
    const dL = kxM - mLeft;
    const dR = mRight - (kxM + kwM);
    const dT = kyM - mTop;
    const dB = mBottom - (kyM + khM);
    return {
      id: k.id, name: k.name,
      wM: kwM.toFixed(2), hM: khM.toFixed(2),
      area: (kwM * khM).toFixed(2),
      matW: kMatW.toFixed(2), matH: kMatH.toFixed(2),
      matArea: (kMatW * kMatH).toFixed(2),
      dL: dL.toFixed(2),
      dR: dR.toFixed(2),
      dT: dT.toFixed(2),
      dB: dB.toFixed(2),
    };
  });

  const perDetails = r.peregorodkalar.map(p => {
    const posM = pxToM(p.pos);
    // Peregorodka qaysi o'qda bo'lishiga qarab xona o'lchami
    const full = p.dir === "horizontal" ? hM : wM;
    const len  = p.dir === "horizontal" ? wM : hM;
    // Material devor chegarasi: full * d / 2
    const mGap = full * d / 2;
    // Material devoridan peregorodkagacha: posM - mGap
    const s1 = posM - mGap;
    // Peregorodkadan qarama-qarshi material devorigacha: full*(1-d/2) - posM
    const s2 = full * (1 - d / 2) - posM;
    return {
      id: p.id, name: p.name, dir: p.dir,
      posM: posM.toFixed(2),
      s1: s1.toFixed(2),
      s2: s2.toFixed(2),
      mat: (len * (1 - d) * 2).toFixed(2),
    };
  });

  return { wM, hM, totalM2, korpM2, cleanM2, matW, matH, baseMat, korpMat, perMat, netMat, korpDetails, perDetails };
});

// ─── Canvas chizish ──────────────────────────────────────────────────
function draw() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Grid (butun canvas)
  ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 0.5;
  for (let x = 0; x <= canvas.width; x += GRID) {
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += GRID) {
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke();
  }

  // Xona chizish uchun yo'riqnoma (xona yo'q bo'lsa)
  if (!room.value) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 15px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText("🏠 Xona chizish rejimi — canvas'da drag qiling", canvas.width/2, canvas.height/2 - 10);
    ctx.font = "12px 'Courier New'";
    ctx.fillStyle = "#64748b";
    ctx.fillText("Har bir katakcha = 1 metr", canvas.width/2, canvas.height/2 + 16);
    ctx.textAlign = "left";

    // Drag preview
    if (dragging.value && dragRect.value) {
      const dr = dragRect.value;
      ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 2;
      ctx.setLineDash([8,4]);
      ctx.fillStyle = "rgba(59,130,246,0.12)";
      ctx.fillRect(dr.x, dr.y, dr.w, dr.h);
      ctx.strokeRect(dr.x, dr.y, dr.w, dr.h);
      ctx.setLineDash([]);
      ctx.fillStyle = "#1d4ed8"; ctx.font = "bold 13px 'Courier New'"; ctx.textAlign = "center";
      ctx.fillText(`${fmtM(dr.w)}m × ${fmtM(dr.h)}m`, dr.x + dr.w/2, dr.y + dr.h/2);
      ctx.textAlign = "left";
    }
    return;
  }

  const r  = room.value;
  const d  = D.value;
  const rx = r.cx, ry = r.cy, rw = r.cw, rh = r.ch;

  // Xona fon
  ctx.fillStyle = "#f0f9ff";
  ctx.fillRect(rx, ry, rw, rh);

  // Grid xona ichida (quyuq)
  ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 0.7;
  for (let x = 0; x <= rw; x += GRID) {
    ctx.beginPath(); ctx.moveTo(rx+x, ry); ctx.lineTo(rx+x, ry+rh); ctx.stroke();
  }
  for (let y = 0; y <= rh; y += GRID) {
    ctx.beginPath(); ctx.moveTo(rx, ry+y); ctx.lineTo(rx+rw, ry+y); ctx.stroke();
  }

  // Material zona
  const mox = rw*d/2, moy = rh*d/2;
  const mx  = rx+mox, my = ry+moy;
  const mw  = rw*(1-d), mh = rh*(1-d);
  ctx.fillStyle = "rgba(239,68,68,0.1)";
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 1.5;
  ctx.setLineDash([6,3]); ctx.strokeRect(mx, my, mw, mh); ctx.setLineDash([]);

  // Material o'lchamlar
  ctx.fillStyle = "#dc2626"; ctx.font = "bold 11px 'Courier New'"; ctx.textAlign = "center";
  ctx.fillText(`${(pxToM(rw)*(1-d)).toFixed(2)}m`, mx+mw/2, my-7);
  ctx.save();
  ctx.translate(mx-7, my+mh/2); ctx.rotate(-Math.PI/2); ctx.textAlign = "center";
  ctx.fillText(`${(pxToM(rh)*(1-d)).toFixed(2)}m`, 0, 0);
  ctx.restore();

  // Peregorodkalar
  r.peregorodkalar.forEach(p => {
    const isSel = p.id === selPerId.value;
    ctx.strokeStyle = isSel ? "#7c3aed" : "#a16207";
    ctx.lineWidth = isSel ? 4 : 3;
    ctx.beginPath();
    if (p.dir === "horizontal") {
      ctx.moveTo(rx, ry+p.pos); ctx.lineTo(rx+rw, ry+p.pos);
    } else {
      ctx.moveTo(rx+p.pos, ry); ctx.lineTo(rx+p.pos, ry+rh);
    }
    ctx.stroke();

    ctx.fillStyle = isSel ? "#7c3aed" : "#92400e";
    ctx.font = "bold 11px 'Courier New'"; ctx.textAlign = "left";
    if (p.dir === "horizontal") {
      ctx.fillText(p.name, rx+4, ry+p.pos-5);
      ctx.font = "10px 'Courier New'"; ctx.fillStyle = "#a16207"; ctx.textAlign = "center";
      ctx.fillText(`${fmtM(p.pos)}m`, rx+rw/2, ry+p.pos/2+4);
      ctx.fillText(`${fmtM(rh-p.pos)}m`, rx+rw/2, ry+p.pos+(rh-p.pos)/2+4);
    } else {
      ctx.save(); ctx.translate(rx+p.pos+5, ry+14); ctx.fillText(p.name, 0, 0); ctx.restore();
      ctx.font = "10px 'Courier New'"; ctx.fillStyle = "#a16207"; ctx.textAlign = "center";
      ctx.fillText(`${fmtM(p.pos)}m`, rx+p.pos/2, ry+rh/2);
      ctx.fillText(`${fmtM(rw-p.pos)}m`, rx+p.pos+(rw-p.pos)/2, ry+rh/2);
    }
  });

  // Korplar
  r.korplar.forEach(k => {
    const kx = rx+k.rx, ky = ry+k.ry;
    const isSel = k.id === selKorpId.value;
    ctx.fillStyle   = isSel ? "#fef08a" : "#fef9c3";
    ctx.strokeStyle = isSel ? "#ca8a04" : "#854d0e";
    ctx.lineWidth   = isSel ? 3 : 2;
    ctx.fillRect(kx, ky, k.w, k.h);
    ctx.strokeRect(kx, ky, k.w, k.h);

    ctx.fillStyle = "#78350f"; ctx.textAlign = "center";
    ctx.font = `bold ${Math.min(12, k.w/4)}px 'Courier New'`;
    ctx.fillText(k.name, kx+k.w/2, ky+k.h/2-4);
    ctx.font = `${Math.min(10, k.w/5)}px 'Courier New'`;
    ctx.fillText(`${fmtM(k.w)}×${fmtM(k.h)}m`, kx+k.w/2, ky+k.h/2+9);

    // Material devoridan masofalar
    const mGX = pxToM(rw)*d/2 * GRID, mGY = pxToM(rh)*d/2 * GRID;
    const mL = rx+mGX, mT = ry+mGY;
    const mR = rx+rw-mGX, mB = ry+rh-mGY;

    ctx.strokeStyle = "#f97316"; ctx.lineWidth = 1;
    ctx.setLineDash([4,3]);
    ctx.fillStyle = "#ea580c"; ctx.font = "10px 'Courier New'"; ctx.textAlign = "center";

    const dL = kx-mL, dR = mR-(kx+k.w), dT = ky-mT, dB = mB-(ky+k.h);
    if (dL>1) { ctx.beginPath(); ctx.moveTo(mL,ky+k.h/2); ctx.lineTo(kx,ky+k.h/2); ctx.stroke(); ctx.fillText(`${fmtM(dL)}m`, mL+dL/2, ky+k.h/2-5); }
    if (dR>1) { ctx.beginPath(); ctx.moveTo(kx+k.w,ky+k.h/2); ctx.lineTo(mR,ky+k.h/2); ctx.stroke(); ctx.fillText(`${fmtM(dR)}m`, kx+k.w+dR/2, ky+k.h/2-5); }
    if (dT>1) { ctx.beginPath(); ctx.moveTo(kx+k.w/2,mT); ctx.lineTo(kx+k.w/2,ky); ctx.stroke(); ctx.fillText(`${fmtM(dT)}m`, kx+k.w/2+24, mT+dT/2+4); }
    if (dB>1) { ctx.beginPath(); ctx.moveTo(kx+k.w/2,ky+k.h); ctx.lineTo(kx+k.w/2,mB); ctx.stroke(); ctx.fillText(`${fmtM(dB)}m`, kx+k.w/2+24, ky+k.h+dB/2+4); }
    ctx.setLineDash([]);
  });

  // Xona devori
  ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 4;
  ctx.strokeRect(rx, ry, rw, rh);

  // Xona o'q chiziqlari
  drawHArrow(ctx, rx, ry-22, rx+rw, `${fmtM(rw)}m`);
  drawVArrow(ctx, rx-24, ry, ry+rh, `${fmtM(rh)}m`);

  // Xona nomi
  ctx.fillStyle = "#1e293b"; ctx.font = "bold 13px 'Courier New'"; ctx.textAlign = "center";
  ctx.fillText(r.name, rx+rw/2, ry+22);

  // Drag preview (korp yoki peregorodka)
  if (dragging.value) {
    if (tool.value === "korp" && dragRect.value) {
      const dr = dragRect.value;
      ctx.strokeStyle = "#eab308"; ctx.lineWidth = 2;
      ctx.setLineDash([6,3]);
      ctx.fillStyle = "rgba(234,179,8,0.18)";
      ctx.fillRect(dr.x, dr.y, dr.w, dr.h);
      ctx.strokeRect(dr.x, dr.y, dr.w, dr.h);
      ctx.setLineDash([]);
      ctx.fillStyle = "#854d0e"; ctx.font = "bold 12px 'Courier New'"; ctx.textAlign = "center";
      ctx.fillText(`${fmtM(dr.w)}m × ${fmtM(dr.h)}m`, dr.x+dr.w/2, dr.y+dr.h/2);
    }
    if (tool.value === "peregorodka" && dragLine.value !== null) {
      ctx.strokeStyle = "#a78bfa"; ctx.lineWidth = 2.5;
      ctx.setLineDash([8,4]);
      ctx.beginPath();
      if (pDir.value === "horizontal") {
        ctx.moveTo(rx, dragLine.value); ctx.lineTo(rx+rw, dragLine.value);
      } else {
        ctx.moveTo(dragLine.value, ry); ctx.lineTo(dragLine.value, ry+rh);
      }
      ctx.stroke(); ctx.setLineDash([]);
      // Masofa ko'rsatish
      const pos = pDir.value === "horizontal" ? dragLine.value - ry : dragLine.value - rx;
      ctx.fillStyle = "#a78bfa"; ctx.font = "11px 'Courier New'"; ctx.textAlign = "center";
      if (pDir.value === "horizontal") {
        ctx.fillText(`${fmtM(pos)}m / ${fmtM(rh-pos)}m`, rx+rw/2, dragLine.value - 6);
      } else {
        ctx.fillText(`${fmtM(pos)}m`, dragLine.value, ry - 6);
      }
    }
  }

  // ── Crosshair va koordinata tooltip ──────────────────────────────
  if (mousePos.value) {
    const mp = mousePos.value;
    // Canvas piksel pozitsiyasi
    const cpx = room.value ? room.value.cx + mp.x * GRID : mp.x * GRID;
    const cpy = room.value ? room.value.cy + mp.y * GRID : mp.y * GRID;

    // Crosshair chiziqlari
    ctx.save();
    ctx.strokeStyle = mp.inRoom ? "rgba(99,102,241,0.55)" : "rgba(148,163,184,0.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    // Gorizontal chiziq
    ctx.beginPath(); ctx.moveTo(0, cpy); ctx.lineTo(canvas.width, cpy); ctx.stroke();
    // Vertikal chiziq
    ctx.beginPath(); ctx.moveTo(cpx, 0); ctx.lineTo(cpx, canvas.height); ctx.stroke();
    ctx.setLineDash([]);

    // Markaziy nuqta
    ctx.fillStyle = mp.inRoom ? "#6366f1" : "#94a3b8";
    ctx.beginPath(); ctx.arc(cpx, cpy, 3, 0, Math.PI * 2); ctx.fill();

    // Tooltip box
    const xLbl = `X: ${mp.x.toFixed(2)}m`;
    const yLbl = `Y: ${mp.y.toFixed(2)}m`;
    const fullLbl = `${xLbl}   ${yLbl}`;
    ctx.font = "bold 12px 'Courier New'";
    const tw = ctx.measureText(fullLbl).width;
    const boxW = tw + 20, boxH = 28;
    // Tooltip xonadan chiqmasin deb pozitsiya tanlash
    let bx = cpx + 12, by = cpy - 36;
    if (bx + boxW > canvas.width - 4) bx = cpx - boxW - 12;
    if (by < 4) by = cpy + 12;

    // Tooltip fon
    ctx.fillStyle = mp.inRoom ? "rgba(30,41,59,0.92)" : "rgba(30,41,59,0.7)";
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(bx, by, boxW, boxH, 6);
    } else {
      ctx.rect(bx, by, boxW, boxH);
    }
    ctx.fill();
    ctx.strokeStyle = mp.inRoom ? "#6366f1" : "#475569";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Tooltip matn — X qizil, Y ko'k
    ctx.fillStyle = "#f87171";
    ctx.fillText(xLbl, bx + 10, by + 18);
    const xPartW = ctx.measureText(xLbl + "   ").width;
    ctx.fillStyle = "#60a5fa";
    ctx.fillText(yLbl, bx + 10 + xPartW, by + 18);

    // Xona chetidagi ruler yozuvlari (agar xona ichida bo'lsa)
    if (mp.inRoom && room.value) {
      const r2 = room.value;
      // X o'qi — yuqori chiziq bo'ylab
      ctx.fillStyle = "rgba(99,102,241,0.9)";
      ctx.font = "bold 11px 'Courier New'"; ctx.textAlign = "center";
      ctx.fillText(`${mp.x.toFixed(2)}m`, cpx, r2.cy - 6);
      // Y o'qi — chap chiziq bo'ylab
      ctx.save();
      ctx.translate(r2.cx - 6, cpy);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.fillText(`${mp.y.toFixed(2)}m`, 0, 0);
      ctx.restore();
    }

    ctx.restore();
  }

  ctx.textAlign = "left";
}

function drawHArrow(ctx: CanvasRenderingContext2D, x1: number, y: number, x2: number, label: string) {
  ctx.save();
  ctx.strokeStyle = "#475569"; ctx.fillStyle = "#475569"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x1,y); ctx.lineTo(x2,y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1,y); ctx.lineTo(x1+8,y-4); ctx.lineTo(x1+8,y+4); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x2,y); ctx.lineTo(x2-8,y-4); ctx.lineTo(x2-8,y+4); ctx.closePath(); ctx.fill();
  ctx.font = "bold 12px 'Courier New'"; ctx.textAlign = "center"; ctx.fillStyle = "#475569";
  ctx.fillText(label, (x1+x2)/2, y-7);
  ctx.restore();
}

function drawVArrow(ctx: CanvasRenderingContext2D, x: number, y1: number, y2: number, label: string) {
  ctx.save();
  ctx.strokeStyle = "#475569"; ctx.fillStyle = "#475569"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x,y1); ctx.lineTo(x,y2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x,y1); ctx.lineTo(x-4,y1+8); ctx.lineTo(x+4,y1+8); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x,y2); ctx.lineTo(x-4,y2-8); ctx.lineTo(x+4,y2-8); ctx.closePath(); ctx.fill();
  ctx.translate(x-14, (y1+y2)/2); ctx.rotate(-Math.PI/2);
  ctx.font = "bold 12px 'Courier New'"; ctx.textAlign = "center"; ctx.fillStyle = "#475569";
  ctx.fillText(label, 0, 0);
  ctx.restore();
}

watch([room, season, selKorpId, selPerId, dragging, dragRect, dragLine, pDir, mousePos],
  () => draw(), { deep: true });
onMounted(() => draw());

// ─── Canvas events ───────────────────────────────────────────────────
function getPos(e: MouseEvent) {
  const rect = canvasRef.value!.getBoundingClientRect();
  const sx = canvasRef.value!.width  / rect.width;
  const sy = canvasRef.value!.height / rect.height;
  return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
}

function inRoom(x: number, y: number): boolean {
  const r = room.value;
  if (!r) return false;
  return x >= r.cx && x <= r.cx+r.cw && y >= r.cy && y <= r.cy+r.ch;
}

// Xonani max o'lchamga cheklash
function clampToCanvas(x: number, y: number, x2: number, y2: number) {
  const cx = Math.max(PAD/2, Math.min(x, CANVAS_SIZE - PAD/2));
  const cy = Math.max(PAD/2, Math.min(y, CANVAS_SIZE - PAD/2));
  // max o'lcham = 10m = MAX_M * GRID
  const maxW = MAX_M * GRID, maxH = MAX_M * GRID;
  const cw = Math.min(Math.abs(x2 - x), maxW);
  const ch = Math.min(Math.abs(y2 - y), maxH);
  return { cx, cy, cw, ch };
}

function onMouseDown(e: MouseEvent) {
  const { x, y } = getPos(e);

  if (tool.value === "select") {
    if (!room.value) return;
    for (const k of room.value.korplar) {
      const kx = room.value.cx+k.rx, ky = room.value.cy+k.ry;
      if (x>=kx && x<=kx+k.w && y>=ky && y<=ky+k.h) {
        selKorpId.value = k.id; selPerId.value = null; return;
      }
    }
    for (const p of room.value.peregorodkalar) {
      if (p.dir==="horizontal" && Math.abs(y-(room.value.cy+p.pos))<9) { selPerId.value=p.id; selKorpId.value=null; return; }
      if (p.dir==="vertical"   && Math.abs(x-(room.value.cx+p.pos))<9) { selPerId.value=p.id; selKorpId.value=null; return; }
    }
    selKorpId.value = null; selPerId.value = null;
    return;
  }

  if (tool.value === "room") {
    if (room.value) return; // allaqachon xona bor
    dragging.value = true;
    dragStart.value = { x, y };
    dragRect.value = { x, y, w: 0, h: 0 };
    return;
  }

  if (!inRoom(x, y)) return;
  dragging.value = true;
  dragStart.value = { x, y };

  if (tool.value === "korp") {
    dragRect.value = { x, y, w: 0, h: 0 };
  } else if (tool.value === "peregorodka") {
    dragLine.value = pDir.value === "horizontal" ? y : x;
  }
}

function onMouseMove(e: MouseEvent) {
  const { x, y } = getPos(e);

  // Sichqoncha pozitsiyasini xona koordinatalarida hisoblash
  if (room.value) {
    const r = room.value;
    const inR = x >= r.cx && x <= r.cx + r.cw && y >= r.cy && y <= r.cy + r.ch;
    mousePos.value = {
      x: Math.max(0, (x - r.cx) / GRID),
      y: Math.max(0, (y - r.cy) / GRID),
      inRoom: inR,
    };
  } else {
    // Xona yo'q — canvas bo'yicha koordinata
    mousePos.value = { x: x / GRID, y: y / GRID, inRoom: false };
  }

  if (!dragging.value || !dragStart.value) return;

  if (tool.value === "room") {
    // Xona chizish — chegaralar: canvas bo'shlig'i + max 10m
    const maxW = MAX_M * GRID, maxH = MAX_M * GRID;
    const x1 = dragStart.value.x, y1 = dragStart.value.y;
    const rawW = x - x1, rawH = y - y1;
    const signX = rawW >= 0 ? 1 : -1, signY = rawH >= 0 ? 1 : -1;
    const clW = Math.min(Math.abs(rawW), maxW) * signX;
    const clH = Math.min(Math.abs(rawH), maxH) * signY;
    dragRect.value = {
      x: clW >= 0 ? x1 : x1 + clW,
      y: clH >= 0 ? y1 : y1 + clH,
      w: Math.abs(clW), h: Math.abs(clH),
    };
    return;
  }

  if (tool.value === "korp" && room.value) {
    const r = room.value;
    const cx = Math.max(r.cx, Math.min(r.cx+r.cw, x));
    const cy = Math.max(r.cy, Math.min(r.cy+r.ch, y));
    dragRect.value = {
      x: Math.min(dragStart.value.x, cx),
      y: Math.min(dragStart.value.y, cy),
      w: Math.abs(cx - dragStart.value.x),
      h: Math.abs(cy - dragStart.value.y),
    };
  } else if (tool.value === "peregorodka" && room.value) {
    const r = room.value;
    if (pDir.value === "horizontal") {
      dragLine.value = Math.max(r.cy + 1, Math.min(r.cy + r.ch - 1, y));
    } else {
      dragLine.value = Math.max(r.cx + 1, Math.min(r.cx + r.cw - 1, x));
    }
  }
}

function onMouseUp() {
  if (!dragging.value) return;
  dragging.value = false;

  if (tool.value === "room" && dragRect.value) {
    const dr = dragRect.value;
    if (dr.w < 10 || dr.h < 10) { dragRect.value = null; return; }
    // Snap only for room (1m = GRID) to keep it clean
    const snappedW = Math.round(dr.w / GRID) * GRID || GRID;
    const snappedH = Math.round(dr.h / GRID) * GRID || GRID;
    const limitW = Math.min(snappedW, MAX_M * GRID);
    const limitH = Math.min(snappedH, MAX_M * GRID);
    pendingRoom.value = { cx: dr.x, cy: dr.y, cw: limitW, ch: limitH };
    modal.value = { type: "room", name: "" };
    dragRect.value = null;
    return;
  }

  if (tool.value === "korp" && dragRect.value) {
    const dr = dragRect.value;
    if (dr.w < 3 || dr.h < 3) { dragRect.value = null; return; }
    // SNAP YO'Q — aniq px qiymatlar (0.30m = 18px, 0.26m ≈ 15.6px → 16px)
    pendingKorp.value = {
      rx: dr.x - room.value!.cx,
      ry: dr.y - room.value!.cy,
      w:  dr.w,
      h:  dr.h,
    };
    modal.value = { type: "korp", name: "" };
    dragRect.value = null;
    return;
  }

  if (tool.value === "peregorodka" && dragLine.value !== null) {
    const r = room.value!;
    pendingPPos.value = pDir.value === "horizontal"
      ? dragLine.value - r.cy
      : dragLine.value - r.cx;
    modal.value = { type: "peregorodka", name: "" };
    dragLine.value = null;
  }
}

// ─── Modal ───────────────────────────────────────────────────────────
function confirmModal() {
  if (!modal.value || !modal.value.name.trim()) return;
  const name = modal.value.name.trim();

  if (modal.value.type === "room" && pendingRoom.value) {
    room.value = { id: Date.now().toString(), name, ...pendingRoom.value, korplar: [], peregorodkalar: [] };
    pendingRoom.value = null;
    tool.value = "select";
  } else if (modal.value.type === "korp" && pendingKorp.value && room.value) {
    room.value.korplar.push({ id: Date.now().toString(), name, ...pendingKorp.value });
    pendingKorp.value = null;
  } else if (modal.value.type === "peregorodka" && room.value) {
    room.value.peregorodkalar.push({ id: Date.now().toString(), name, dir: pDir.value, pos: pendingPPos.value });
  }
  modal.value = null;
}

function cancelModal() {
  modal.value = null; pendingRoom.value = null; pendingKorp.value = null;
  dragRect.value = null; dragLine.value = null;
}

// Asboblar ro'yxati — Tool type bilan aniq typed
const toolList: Array<{ id: Tool; label: string; c: string; disabled: boolean }> = [
  { id: "room",        label: "🏠 Xona Chizish",   c: "#3b82f6", disabled: false },
  { id: "select",      label: "↖ Tanlash",          c: "#10b981", disabled: false },
  { id: "korp",        label: "🟡 Korp Chizish",    c: "#eab308", disabled: false },
  { id: "peregorodka", label: "🪵 Peregorodka",     c: "#a78bfa", disabled: false },
];

function deleteRoom() { room.value = null; selKorpId.value = null; selPerId.value = null; tool.value = "room"; }
function deleteKorp(id: string) {
  if (!room.value) return;
  room.value.korplar = room.value.korplar.filter(k => k.id !== id);
  if (selKorpId.value === id) selKorpId.value = null;
}
function deletePer(id: string) {
  if (!room.value) return;
  room.value.peregorodkalar = room.value.peregorodkalar.filter(p => p.id !== id);
  if (selPerId.value === id) selPerId.value = null;
}
function setTool(id: string) { tool.value = id as Tool; }
</script>

<template>
  <div class="app">
    <header class="hdr">
      <h1 class="hdr-title">⬛ NATЯЖНОЙ ПОТОЛОК КАЛЬКУЛЯТОРИ</h1>
      <p class="hdr-sub">INTERAKTIV CHIZISH · KORP & PEREGORODKA · MAX 10×10m</p>
    </header>

    <div class="layout">

      <!-- ─── CHAP PANEL ─── -->
      <aside class="sidebar">

        <!-- Asboblar -->
        <div class="panel">
          <div class="plabel">ASBOBLAR</div>
          <button v-for="t in ([
            { id:'room',        label:'🏠 Xona Chizish',    c:'#3b82f6', disabled: !!room },
            { id:'select',      label:'↖ Tanlash',           c:'#10b981', disabled: !room },
            { id:'korp',        label:'🟡 Korp Chizish',     c:'#eab308', disabled: !room },
            { id:'peregorodka', label:'🪵 Peregorodka',      c:'#a78bfa', disabled: !room },
          ])"
            :key="t.id"
            type="button"
            class="tbtn"
            :class="{ 'tbtn-on': tool === t.id, 'tbtn-dis': t.disabled }"
            :style="{ '--a': t.c }"
            :disabled="t.disabled"
            @click="setTool(t.id)"
          >{{ t.label }}</button>

          <!-- Peregorodka yo'nalishi -->
          <template v-if="tool === 'peregorodka'">
            <div class="plabel" style="margin-top:10px">YO'NALISH</div>
            <div class="row2">
              <button class="pbtn" :class="{ 'pbtn-on': pDir==='horizontal' }" @click="pDir='horizontal'">↔ Gorizontal</button>
              <button class="pbtn" :class="{ 'pbtn-on': pDir==='vertical' }"   @click="pDir='vertical'">↕ Vertikal</button>
            </div>
          </template>

          <!-- Hint -->
          <div class="hint-box" v-if="tool === 'room' && !room">📌 Canvas'da xonani drag qilib chizing. Xona avtomatik 1m ga yaxlitlanadi.</div>
          <div class="hint-box" v-if="tool === 'korp' && room">📌 Xona ichida korp maydonini drag qiling. O'lcham mm aniqligida saqlanadi.</div>
          <div class="hint-box" v-if="tool === 'peregorodka' && room">📌 Peregorodka chizig'ini torting.</div>
        </div>

        <!-- Mavsum -->
        <div class="panel">
          <div class="plabel">MAVSUM</div>
          <div class="row2">
            <button class="sbtn" :class="{ 'sbtn-on': season==='issiq' }" @click="season='issiq'">☀️ Issiq<br/><small>−7%</small></button>
            <button class="sbtn" :class="{ 'sbtn-on': season==='sovuq' }" @click="season='sovuq'">❄️ Sovuq<br/><small>−6%</small></button>
          </div>
        </div>

        <!-- Xona info -->
        <div v-if="room" class="panel">
          <div class="plabel">🏠 {{ room.name }}</div>
          <div class="info-row"><span class="ik">Eni</span><span class="iv">{{ stats?.wM.toFixed(2) }}m</span></div>
          <div class="info-row"><span class="ik">Uzunligi</span><span class="iv">{{ stats?.hM.toFixed(2) }}m</span></div>
          <div class="info-row"><span class="ik">Maydon</span><span class="iv blue">{{ stats?.totalM2.toFixed(2) }}m²</span></div>
          <button class="btn btn-ghost mt6" @click="deleteRoom">🗑 Xonani o'chirish</button>
        </div>

        <!-- Korplar -->
        <div v-if="room && room.korplar.length > 0" class="panel">
          <div class="plabel">KORPLAR ({{ room.korplar.length }})</div>
          <div v-for="k in room.korplar" :key="k.id"
            class="li" :class="{ 'li-on': k.id===selKorpId }"
            @click="selKorpId=k.id; selPerId=null">
            <div>
              <div class="li-name">{{ k.name }}</div>
              <div class="li-sub">{{ fmtM(k.w) }}m × {{ fmtM(k.h) }}m = {{ (pxToM(k.w)*pxToM(k.h)).toFixed(3) }}m²</div>
            </div>
            <button class="del" @click.stop="deleteKorp(k.id)">×</button>
          </div>
        </div>

        <!-- Peregorodkalar -->
        <div v-if="room && room.peregorodkalar.length > 0" class="panel">
          <div class="plabel">PEREGORODKALAR ({{ room.peregorodkalar.length }})</div>
          <div v-for="p in room.peregorodkalar" :key="p.id"
            class="li" :class="{ 'li-on': p.id===selPerId }"
            @click="selPerId=p.id; selKorpId=null">
            <div>
              <div class="li-name">{{ p.name }}</div>
              <div class="li-sub">{{ p.dir==='horizontal'?'↔':'↕' }} {{ fmtM(p.pos) }}m dan</div>
            </div>
            <button class="del" @click.stop="deletePer(p.id)">×</button>
          </div>
        </div>

      </aside>

      <!-- ─── CANVAS + STATS ─── -->
      <main class="main-col">

        <!-- Canvas -->
        <div class="cbox">
          <div class="cbar">
            <span>CHIZISH MAYDONI · 1 KATAKCHA = 1 METR</span>
            <span :style="{ color: tool==='room'?'#3b82f6':tool==='select'?'#10b981':tool==='korp'?'#eab308':'#a78bfa' }">
              {{ tool==='room'?'🏠 XONA CHIZISH':tool==='select'?'↖ TANLASH':tool==='korp'?'🟡 KORP':'🪵 PEREGORODKA' }}
            </span>
          </div>

          <!-- Koordinata status bar -->
          <div class="coord-bar">
            <template v-if="mousePos && room">
              <span class="coord-x">
                ⟶ X: <strong>{{ mousePos.x.toFixed(2) }}m</strong>
              </span>
              <span class="coord-sep">|</span>
              <span class="coord-y">
                ⟳ Y: <strong>{{ mousePos.y.toFixed(2) }}m</strong>
              </span>
              <span class="coord-sep">|</span>
              <span class="coord-from" v-if="mousePos.inRoom">
                O'ngdan: <strong>{{ (room.cw / GRID - mousePos.x).toFixed(2) }}m</strong>
                &nbsp; Pastdan: <strong>{{ (room.ch / GRID - mousePos.y).toFixed(2) }}m</strong>
              </span>
              <span class="coord-out" v-else>Xona tashqarisida</span>
            </template>
            <template v-else-if="mousePos && !room">
              <span class="coord-x">⟶ X: <strong>{{ mousePos.x.toFixed(2) }}m</strong></span>
              <span class="coord-sep">|</span>
              <span class="coord-y">⟳ Y: <strong>{{ mousePos.y.toFixed(2) }}m</strong></span>
            </template>
            <template v-else>
              <span style="color:#475569">Sichqonchani canvas ustiga olib keling...</span>
            </template>
          </div>
          <canvas
            ref="canvasRef"
            :width="CANVAS_SIZE"
            :height="CANVAS_SIZE"
            class="cnv"
            :style="{ cursor: tool==='select'?'default':'crosshair' }"
            @mousedown="onMouseDown"
            @mousemove="onMouseMove"
            @mouseup="onMouseUp"
            @mouseleave="mousePos = null"
          />
        </div>

        <!-- Stats -->
        <div v-if="stats" class="stats-row">

          <!-- Material hisobi -->
          <div class="sc sc-blue">
            <div class="plabel" style="color:#60a5fa">MATERIAL HISOBI</div>
            <div class="sgrid">
              <div class="si" v-for="s in [
                { l:'Xona eni',          v:`${stats.wM.toFixed(2)}m`,           c:'#e2e8f0' },
                { l:'Xona uzunligi',     v:`${stats.hM.toFixed(2)}m`,           c:'#e2e8f0' },
                { l:'Jami maydon',       v:`${stats.totalM2.toFixed(2)}m²`,     c:'#60a5fa' },
                { l:'Korplar maydoni',   v:`${stats.korpM2.toFixed(3)}m²`,      c:'#eab308' },
                { l:'Toza maydon',       v:`${stats.cleanM2.toFixed(2)}m²`,     c:'#10b981' },
                { l:`Asosiy mat. −${Math.round(D*100)}%`, v:`${stats.baseMat.toFixed(2)}m²`, c:'#f87171' },
                { l:'Korp mat. (−)',     v:`−${stats.korpMat.toFixed(3)}m²`,    c:'#eab308' },
                { l:'Peregorodka (+)',   v:`+${stats.perMat.toFixed(2)}m²`,     c:'#a78bfa' },
                { l:'Mat. eni',          v:`${stats.matW.toFixed(2)}m`,         c:'#f87171' },
                { l:'Mat. uzunligi',     v:`${stats.matH.toFixed(2)}m`,         c:'#f87171' },
              ]" :key="s.l">
                <div class="si-l">{{ s.l }}</div>
                <div class="si-v" :style="{ color: s.c }">{{ s.v }}</div>
              </div>
            </div>
            <div class="total-mat">
              <span class="tm-l">JAMI KERAKLI MATERIAL</span>
              <span class="tm-v">{{ stats.netMat.toFixed(2) }} m²</span>
            </div>
          </div>

          <!-- Korp detali -->
          <div v-if="stats.korpDetails.length" class="sc sc-yellow">
            <div class="plabel" style="color:#eab308">KORPLAR — MATERIAL DEVORIDAN MASOFA (−{{ Math.round(D*100) }}%)</div>
            <div v-for="k in stats.korpDetails" :key="k.id" class="det">
              <div class="det-title">
                {{ k.name }} · Xona: {{ k.wM }}m × {{ k.hM }}m ({{ k.area }}m²)
              </div>
              <div class="det-subtitle">
                Material: {{ k.matW }}m × {{ k.matH }}m ({{ k.matArea }}m²)
              </div>
              <div class="det-grid">
                <div class="det-item"><span class="di-l">⬅ Chapdan</span><span class="di-v" :class="{ neg: parseFloat(k.dL)<0 }">{{ k.dL }}m</span></div>
                <div class="det-item"><span class="di-l">➡ O'ngdan</span><span class="di-v" :class="{ neg: parseFloat(k.dR)<0 }">{{ k.dR }}m</span></div>
                <div class="det-item"><span class="di-l">⬆ Yuqoridan</span><span class="di-v" :class="{ neg: parseFloat(k.dT)<0 }">{{ k.dT }}m</span></div>
                <div class="det-item"><span class="di-l">⬇ Quyidan</span><span class="di-v" :class="{ neg: parseFloat(k.dB)<0 }">{{ k.dB }}m</span></div>
              </div>
            </div>
          </div>

          <!-- Peregorodka detali -->
          <div v-if="stats.perDetails.length" class="sc sc-purple">
            <div class="plabel" style="color:#a78bfa">PEREGORODKALAR — MATERIAL DEVORIDAN (−{{ Math.round(D*100) }}%)</div>
            <div v-for="p in stats.perDetails" :key="p.id" class="det">
              <div class="det-title">{{ p.name }} · {{ p.dir==='horizontal'?'↔ Gorizontal':'↕ Vertikal' }}</div>
              <div class="det-subtitle">Xona devoridan: {{ p.posM }}m</div>
              <div class="det-grid">
                <div class="det-item">
                  <span class="di-l">{{ p.dir==='horizontal'?'⬆ Yuqori mat.':'⬅ Chap mat.' }}</span>
                  <span class="di-v" :class="{ neg: parseFloat(p.s1)<0 }">{{ p.s1 }}m</span>
                </div>
                <div class="det-item">
                  <span class="di-l">{{ p.dir==='horizontal'?'⬇ Pastki mat.':"➡ O'ng mat." }}</span>
                  <span class="di-v" :class="{ neg: parseFloat(p.s2)<0 }">{{ p.s2 }}m</span>
                </div>
                <div class="det-item">
                  <span class="di-l">Material sarfi (2 tomon)</span>
                  <span class="di-v" style="color:#a78bfa">{{ p.mat }}m²</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>

    <!-- ─── MODAL ─── -->
    <Teleport to="body">
      <div v-if="modal" class="ov" @click.self="cancelModal">
        <div class="mdl">
          <div class="mdl-title" :style="{ color: modal.type==='room'?'#3b82f6':modal.type==='korp'?'#eab308':'#a78bfa' }">
            {{ modal.type==='room'?'🏠 XONA NOMI':modal.type==='korp'?'🟡 KORP NOMI':'🪵 PEREGORODKA NOMI' }}
          </div>
          <div v-if="pendingRoom && modal.type==='room'" class="mdl-info">
            O'lcham: {{ fmtM(pendingRoom.cw) }}m × {{ fmtM(pendingRoom.ch) }}m = {{ (pxToM(pendingRoom.cw)*pxToM(pendingRoom.ch)).toFixed(2) }}m²
          </div>
          <div v-if="pendingKorp && modal.type==='korp'" class="mdl-info">
            O'lcham: <strong>{{ fmtM(pendingKorp.w) }}m × {{ fmtM(pendingKorp.h) }}m</strong> = {{ (pxToM(pendingKorp.w)*pxToM(pendingKorp.h)).toFixed(3) }}m²
          </div>
          <div v-if="modal.type==='peregorodka'" class="mdl-info">
            {{ pDir==='horizontal'?'Gorizontal':'Vertikal' }} · {{ fmtM(pendingPPos) }}m dan
          </div>
          <input
            v-model="modal.name"
            class="mdl-inp"
            :placeholder="modal.type==='room'?'Masalan: Mehmonxona':modal.type==='korp'?'Masalan: Ustun':'Masalan: 1-peregorodka'"
            autofocus
            @keydown.enter="confirmModal"
            @keydown.escape="cancelModal"
          />
          <div class="mdl-btns">
            <button class="mbtn"
              :style="{ background: modal.type==='room'?'#3b82f6':modal.type==='korp'?'#eab308':'#7c3aed', color: modal.type==='korp'?'#1e293b':'white' }"
              @click="confirmModal">✓ TASDIQLASH</button>
            <button class="mcancel" @click="cancelModal">✕</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

.app {
  min-height:100vh;
  background:linear-gradient(135deg,#0f0f23,#1a1a3e 50%,#0d1b2a);
  font-family:"Courier New",monospace;
  color:#e2e8f0;
  padding:14px;
}

.hdr { text-align:center; padding:14px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.1); border-radius:14px; margin-bottom:16px; }
.hdr-title { font-size:22px; font-weight:bold; letter-spacing:2px; background:linear-gradient(90deg,#60a5fa,#a78bfa,#34d399); -webkit-background-clip:text; -webkit-text-fill-color:transparent; margin-bottom:4px; }
.hdr-sub { color:#64748b; font-size:11px; letter-spacing:2px; }

.layout { display:flex; gap:14px; align-items:flex-start; }
.sidebar { width:230px; flex-shrink:0; display:flex; flex-direction:column; gap:10px; }
.main-col { flex:1; display:flex; flex-direction:column; gap:14px; }

.panel { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); border-radius:12px; padding:14px; }
.plabel { font-size:10px; letter-spacing:2px; color:#64748b; margin-bottom:10px; text-transform:uppercase; }

.row2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.mt6 { margin-top:6px; }

.btn { display:block; width:100%; padding:9px; border:none; border-radius:8px; font-family:inherit; font-size:13px; font-weight:bold; cursor:pointer; letter-spacing:1px; margin-top:8px; transition:opacity .2s; }
.btn:hover { opacity:.85; }
.btn-ghost { background:rgba(239,68,68,.15); border:1px solid rgba(239,68,68,.3); color:#f87171; }

.info-row { display:flex; justify-content:space-between; font-size:12px; padding:5px 0; border-bottom:1px solid rgba(255,255,255,.05); }
.ik { color:#94a3b8; }
.iv { font-weight:bold; color:#e2e8f0; }
.iv.blue { color:#60a5fa; }

.sbtn { flex:1; padding:8px 4px; border-radius:8px; border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.04); color:#94a3b8; font-family:inherit; font-size:11px; cursor:pointer; text-align:center; line-height:1.6; transition:all .15s; }
.sbtn-on { background:rgba(59,130,246,.2); border-color:#60a5fa; color:#60a5fa; font-weight:bold; }

.tbtn { display:block; width:100%; padding:9px 12px; margin-bottom:6px; border-radius:8px; border:2px solid transparent; background:rgba(255,255,255,.04); color:#94a3b8; font-family:inherit; font-size:12px; cursor:pointer; text-align:left; text-decoration:none; text-underline-offset:0; transition:all .15s; outline:none; }
.tbtn-on  { border-color:var(--a); background:color-mix(in srgb,var(--a) 14%,transparent); color:var(--a); font-weight:bold; }
.tbtn-dis { opacity:.35; cursor:not-allowed; }

.pbtn { flex:1; padding:7px 4px; border-radius:7px; border:1px solid rgba(167,139,250,.25); background:rgba(167,139,250,.06); color:#a78bfa; font-family:inherit; font-size:11px; cursor:pointer; transition:all .15s; }
.pbtn-on { background:rgba(167,139,250,.22); border-color:#a78bfa; font-weight:bold; }

.hint-box { margin-top:10px; font-size:10px; color:#64748b; background:rgba(255,255,255,.04); border-radius:7px; padding:8px 10px; line-height:1.6; border:1px solid rgba(255,255,255,.06); }

.li { display:flex; justify-content:space-between; align-items:center; padding:7px 9px; margin-bottom:5px; border-radius:8px; background:rgba(255,255,255,.04); border:1px solid transparent; cursor:pointer; transition:all .15s; }
.li-on { background:rgba(234,179,8,.1); border-color:#eab308; }
.li-name { font-size:12px; font-weight:bold; color:#e2e8f0; }
.li-sub  { font-size:10px; color:#64748b; }
.del { background:rgba(239,68,68,.2); border:1px solid rgba(239,68,68,.3); color:#ef4444; border-radius:5px; padding:1px 7px; cursor:pointer; font-family:inherit; font-size:14px; }

.cbox { background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.1); border-radius:14px; padding:12px; }
.cbar { display:flex; justify-content:space-between; font-size:10px; letter-spacing:2px; color:#64748b; margin-bottom:6px; text-transform:uppercase; }
.cnv  { display:block; background:#f8fafc; border-radius:8px; border:1px solid rgba(255,255,255,.08); max-width:100%; }

/* Koordinata status bar */
.coord-bar {
  display:flex; align-items:center; gap:10px; flex-wrap:wrap;
  margin-top:8px; padding:7px 12px;
  background:rgba(15,15,35,0.6);
  border:1px solid rgba(99,102,241,0.2);
  border-radius:8px;
  font-size:12px; font-family:"Courier New",monospace;
  min-height:32px;
}
.coord-x    { color:#f87171; }
.coord-x strong { color:#fca5a5; }
.coord-y    { color:#60a5fa; }
.coord-y strong { color:#93c5fd; }
.coord-from { color:#94a3b8; }
.coord-from strong { color:#e2e8f0; }
.coord-out  { color:#475569; font-style:italic; }
.coord-sep  { color:#334155; }

.stats-row { display:flex; flex-wrap:wrap; gap:12px; }
.sc { flex:1; min-width:260px; border-radius:12px; padding:16px; }
.sc-blue   { background:rgba(59,130,246,.08);  border:1px solid rgba(59,130,246,.25); }
.sc-yellow { background:rgba(234,179,8,.08);   border:1px solid rgba(234,179,8,.25); }
.sc-purple { background:rgba(167,139,250,.08); border:1px solid rgba(167,139,250,.25); }

.sgrid { display:grid; grid-template-columns:1fr 1fr; gap:7px; margin-bottom:12px; }
.si { background:rgba(255,255,255,.05); border-radius:7px; padding:7px 9px; }
.si-l { font-size:9px; color:#64748b; margin-bottom:2px; }
.si-v { font-size:13px; font-weight:bold; }

.total-mat { display:flex; justify-content:space-between; align-items:center; background:rgba(59,130,246,.15); border:1px solid rgba(59,130,246,.3); border-radius:9px; padding:10px 14px; }
.tm-l { font-size:11px; letter-spacing:1px; color:#94a3b8; }
.tm-v { font-size:20px; font-weight:bold; color:#60a5fa; }

.det { background:rgba(255,255,255,.04); border-radius:9px; padding:10px 12px; margin-bottom:8px; }
.det-title { font-size:12px; font-weight:bold; color:#fbbf24; margin-bottom:3px; }
.det-subtitle { font-size:10px; color:#64748b; margin-bottom:7px; }
.det-grid  { display:grid; grid-template-columns:1fr 1fr; gap:5px; }
.det-item  { display:flex; justify-content:space-between; font-size:11px; background:rgba(255,255,255,.04); border-radius:5px; padding:5px 8px; }
.di-l { color:#94a3b8; }
.di-v { font-weight:bold; color:#fbbf24; }
.di-v.neg { color:#f87171 !important; }

.ov  { position:fixed; inset:0; background:rgba(0,0,0,.75); display:flex; align-items:center; justify-content:center; z-index:999; backdrop-filter:blur(5px); }
.mdl { background:#1e293b; border:1px solid rgba(255,255,255,.15); border-radius:16px; padding:26px; min-width:300px; box-shadow:0 25px 60px rgba(0,0,0,.6); }
.mdl-title { font-size:14px; font-weight:bold; letter-spacing:2px; margin-bottom:10px; }
.mdl-info  { font-size:11px; color:#94a3b8; margin-bottom:12px; line-height:1.6; }
.mdl-info strong { color:#e2e8f0; }
.mdl-inp   { width:100%; padding:11px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.2); border-radius:8px; color:#e2e8f0; font-family:inherit; font-size:14px; margin-bottom:14px; }
.mdl-inp:focus { outline:none; border-color:#60a5fa; }
.mdl-btns  { display:flex; gap:9px; }
.mbtn      { flex:1; padding:10px; border:none; border-radius:8px; font-family:inherit; font-weight:bold; font-size:13px; cursor:pointer; letter-spacing:1px; transition:opacity .2s; }
.mbtn:hover { opacity:.85; }
.mcancel   { padding:10px 14px; background:rgba(239,68,68,.15); border:1px solid rgba(239,68,68,.3); border-radius:8px; color:#ef4444; font-family:inherit; font-size:13px; cursor:pointer; }

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button { -webkit-appearance:none; }
input[type="number"] { -moz-appearance:textfield; }
</style>