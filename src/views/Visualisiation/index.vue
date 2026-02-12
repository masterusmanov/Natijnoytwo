<template>
  <div class="ceiling-designer">
    <div class="container">
      <!-- Dizayn rasmlar to'plami -->
      <div class="design-gallery">
        <h3>Dizayn namunalari</h3>
        <div class="gallery-grid">
          <div
            v-for="(design, index) in designs"
            :key="index"
            class="design-item"
            draggable="true"
            @dragstart="handleDragStart($event, design)"
          >
            <img :src="design.url" :alt="design.name" />
            <p>{{ design.name }}</p>
          </div>
        </div>
      </div>

      <!-- Xona rasmi (patalok) -->
      <div class="room-container">
        <h3>Xona patalogi</h3>
        <div
          class="room-canvas"
          @dragover.prevent="handleDragOver"
          @drop="handleDrop"
          @dragleave="isDragging = false"
          :class="{ 'drag-active': isDragging }"
        >
          <img src="../../assets/images/patalok_images/room.webp" alt="Xona" class="room-image" />
          
          <!-- Patalokdagi dizayn natijasi - SVG bilan perspektiv -->
          <svg
            v-if="appliedDesign"
            class="ceiling-design-svg"
            :style="{ opacity: opacity / 100 }"
          >
            <defs>
              <!-- Pattern rasmni polygon ichiga joylashtirish uchun -->
              <pattern 
                id="imagePattern" 
                :x="minX" 
                :y="minY" 
                :width="maxWidth" 
                :height="maxHeight" 
                patternUnits="userSpaceOnUse"
              >
                <image
                  :href="appliedDesign.url"
                  x="0"
                  y="0"
                  :width="maxWidth"
                  :height="maxHeight"
                  preserveAspectRatio="none"
                />
              </pattern>
            </defs>
            
            <!-- Polygon - rasm bilan to'ldirilgan -->
            <polygon
              :points="borderPoints"
              fill="url(#imagePattern)"
              stroke="#667eea"
              stroke-width="3"
              class="image-poly"
            />
            
            <!-- To'rtta burchak nuqtalari -->
            <g class="corner-handles">
              <!-- Yuqori chap -->
              <circle
                :cx="corners.tl.x"
                :cy="corners.tl.y"
                r="10"
                class="corner-handle corner-tl"
                @mousedown.stop="startCornerDrag($event, 'tl')"
              />
              <text :x="corners.tl.x - 25" :y="corners.tl.y - 15" class="corner-label">YCH</text>
              
              <!-- Yuqori o'ng -->
              <circle
                :cx="corners.tr.x"
                :cy="corners.tr.y"
                r="10"
                class="corner-handle corner-tr"
                @mousedown.stop="startCornerDrag($event, 'tr')"
              />
              <text :x="corners.tr.x + 15" :y="corners.tr.y - 15" class="corner-label">YO'</text>
              
              <!-- Pastki chap -->
              <circle
                :cx="corners.bl.x"
                :cy="corners.bl.y"
                r="10"
                class="corner-handle corner-bl"
                @mousedown.stop="startCornerDrag($event, 'bl')"
              />
              <text :x="corners.bl.x - 25" :y="corners.bl.y + 25" class="corner-label">PCH</text>
              
              <!-- Pastki o'ng -->
              <circle
                :cx="corners.br.x"
                :cy="corners.br.y"
                r="10"
                class="corner-handle corner-br"
                @mousedown.stop="startCornerDrag($event, 'br')"
              />
              <text :x="corners.br.x + 15" :y="corners.br.y + 25" class="corner-label">PO'</text>
            </g>

            <!-- Delete button -->
            <g class="delete-button" @click.stop="removeDesign">
              <circle
                :cx="corners.tr.x + 20"
                :cy="corners.tr.y - 20"
                r="14"
                fill="#e74c3c"
                stroke="white"
                stroke-width="2"
              />
              <text
                :x="corners.tr.x + 20"
                :y="corners.tr.y - 15"
                text-anchor="middle"
                fill="white"
                font-size="18"
                font-weight="bold"
                style="cursor: pointer;"
              >✕</text>
            </g>
          </svg>

          <div v-if="!appliedDesign" class="placeholder">
            <p>📐 Dizayn rasmni bu yerga torting</p>
            <p class="hint">Keyin to'rtta burchakni tortib perspektivaga moslab sozlang</p>
          </div>
        </div>

        <!-- Boshqaruv tugmalari -->
        <div v-if="appliedDesign" class="controls">
          <div class="control-group">
            <label>Shaffoflik: {{ opacity }}%</label>
            <input
              type="range"
              min="0"
              max="100"
              v-model="opacity"
              class="slider"
            />
          </div>

          <div class="corner-positions">
            <div class="corner-info">
              <h4>Burchaklar koordinatalari:</h4>
              <div class="coords-grid">
                <div><strong>YCH:</strong> ({{ Math.round(corners.tl.x) }}, {{ Math.round(corners.tl.y) }})</div>
                <div><strong>YO':</strong> ({{ Math.round(corners.tr.x) }}, {{ Math.round(corners.tr.y) }})</div>
                <div><strong>PCH:</strong> ({{ Math.round(corners.bl.x) }}, {{ Math.round(corners.bl.y) }})</div>
                <div><strong>PO':</strong> ({{ Math.round(corners.br.x) }}, {{ Math.round(corners.br.y) }})</div>
              </div>
            </div>
          </div>

          <button @click="resetCorners" class="reset-btn">🔄 Burchaklarni tiklash</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import roomImageone from '../../assets/images/patalok_images/one.jpg';
import roomImagetwo from '../../assets/images/patalok_images/two.jpg';
import roomImagethree from '../../assets/images/patalok_images/three.jpg';
import roomImagefour from '../../assets/images/patalok_images/four.jpg';

interface Design {
  name: string
  url: string
}

interface Corner {
  x: number
  y: number
}

interface Corners {
  tl: Corner  // top-left (yuqori chap)
  tr: Corner  // top-right (yuqori o'ng)
  bl: Corner  // bottom-left (pastki chap)
  br: Corner  // bottom-right (pastki o'ng)
}

// Dizayn rasmlar to'plami
const designs = ref<Design[]>([
  { name: 'Oltin naqsh', url: roomImageone },
  { name: 'Gul naqshi', url: roomImagetwo },
  { name: 'Geometrik', url: roomImagethree },
  { name: 'Klassik', url: roomImagefour }
])

const appliedDesign = ref<Design | null>(null)
const isDragging = ref(false)
const opacity = ref(80)

// To'rtta burchak koordinatalari - boshlang'ich qiymatlar
const corners = ref<Corners>({
  tl: { x: 200, y: 100 },   // yuqori chap
  tr: { x: 600, y: 100 },   // yuqori o'ng
  bl: { x: 150, y: 500 },   // pastki chap
  br: { x: 650, y: 500 }    // pastki o'ng
})

// Drag state
const dragState = ref({
  isCornerDragging: false,
  activeCorner: '',
  startX: 0,
  startY: 0,
  canvasRect: null as DOMRect | null
})

// Drag and drop handlerlari
const handleDragStart = (event: DragEvent, design: Design) => {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('design', JSON.stringify(design))
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = true
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false
  
  if (event.dataTransfer) {
    const designData = event.dataTransfer.getData('design')
    if (designData) {
      appliedDesign.value = JSON.parse(designData)
      
      // Markazga qo'yish
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
      const centerX = rect.width / 2
      const centerY = rect.height / 2
      const width = 400
      const height = 300
      
      corners.value = {
        tl: { x: centerX - width / 2, y: centerY - height / 2 },
        tr: { x: centerX + width / 2, y: centerY - height / 2 },
        bl: { x: centerX - width / 2, y: centerY + height / 2 },
        br: { x: centerX + width / 2, y: centerY + height / 2 }
      }
    }
  }
}

// Burchakni boshlash
const startCornerDrag = (event: MouseEvent, corner: string) => {
  dragState.value.isCornerDragging = true
  dragState.value.activeCorner = corner
  
  const canvas = document.querySelector('.room-canvas')
  if (canvas) {
    dragState.value.canvasRect = canvas.getBoundingClientRect()
  }
  
  document.addEventListener('mousemove', onCornerMove)
  document.addEventListener('mouseup', onCornerEnd)
  event.preventDefault()
}

// Burchakni harakatlantirish
const onCornerMove = (event: MouseEvent) => {
  if (!dragState.value.isCornerDragging || !dragState.value.canvasRect) return
  
  const corner = dragState.value.activeCorner as keyof Corners
  const rect = dragState.value.canvasRect
  
  // Canvas ichidagi koordinatalarni hisoblash
  let x = event.clientX - rect.left
  let y = event.clientY - rect.top
  
  // Canvas chegaralaridan chiqib ketmasligi uchun
  x = Math.max(0, Math.min(x, rect.width))
  y = Math.max(0, Math.min(y, rect.height))
  
  corners.value[corner] = { x, y }
}

// Burchak harakatini tugatish
const onCornerEnd = () => {
  dragState.value.isCornerDragging = false
  dragState.value.activeCorner = ''
  
  document.removeEventListener('mousemove', onCornerMove)
  document.removeEventListener('mouseup', onCornerEnd)
}

// Dizaynni o'chirish
const removeDesign = () => {
  appliedDesign.value = null
  opacity.value = 80
}

// Burchaklarni tiklash
const resetCorners = () => {
  const canvas = document.querySelector('.room-canvas')
  if (canvas) {
    const rect = canvas.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const width = 400
    const height = 300
    
    corners.value = {
      tl: { x: centerX - width / 2, y: centerY - height / 2 },
      tr: { x: centerX + width / 2, y: centerY - height / 2 },
      bl: { x: centerX - width / 2, y: centerY + height / 2 },
      br: { x: centerX + width / 2, y: centerY + height / 2 }
    }
  }
}

// SVG polygon points
const borderPoints = computed(() => {
  const c = corners.value
  return `${c.tl.x},${c.tl.y} ${c.tr.x},${c.tr.y} ${c.br.x},${c.br.y} ${c.bl.x},${c.bl.y}`
})

const minX = computed(() => {
  const c = corners.value
  return Math.min(c.tl.x, c.tr.x, c.bl.x, c.br.x)
})

const minY = computed(() => {
  const c = corners.value
  return Math.min(c.tl.y, c.tr.y, c.bl.y, c.br.y)
})

const clipPathPoints = computed(() => borderPoints.value)

// Transform matrix hisoblash (perspective uchun)
const maxWidth = computed(() => {
  const c = corners.value
  return Math.max(
    Math.abs(c.tr.x - c.tl.x),
    Math.abs(c.br.x - c.bl.x),
    Math.abs(c.br.x - minX.value),
    Math.abs(c.tr.x - minX.value)
  ) + 50
})

const maxHeight = computed(() => {
  const c = corners.value
  return Math.max(
    Math.abs(c.bl.y - c.tl.y),
    Math.abs(c.br.y - c.tr.y),
    Math.abs(c.bl.y - minY.value),
    Math.abs(c.br.y - minY.value)
  ) + 50
})

// Cleanup
onUnmounted(() => {
  document.removeEventListener('mousemove', onCornerMove)
  document.removeEventListener('mouseup', onCornerEnd)
})
</script>

<style scoped>
.ceiling-designer {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 2rem;
}

h3 {
  color: white;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
}

/* Dizayn gallery */
.design-gallery {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  height: fit-content;
  position: sticky;
  top: 2rem;
}

.gallery-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  padding-right: 0.5rem;
}

.gallery-grid::-webkit-scrollbar {
  width: 6px;
}

.gallery-grid::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.gallery-grid::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.design-item {
  cursor: grab;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  background: white;
}

.design-item:active {
  cursor: grabbing;
}

.design-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  border-color: #667eea;
}

.design-item img {
  width: 100%;
  height: 180px;
  object-fit: cover;
  display: block;
}

.design-item p {
  padding: 0.75rem;
  text-align: center;
  font-weight: 600;
  color: #333;
  margin: 0;
}

/* Xona container */
.room-container {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.room-canvas {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  border: 3px dashed #ccc;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  background: #f5f5f5;
}

.room-canvas.drag-active {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

.room-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  pointer-events: none;
  user-select: none;
}

/* SVG dizayn */
.ceiling-design-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.image-poly {
  pointer-events: none;
  transition: all 0.1s ease;
}

/* Burchak nuqtalari */
.corner-handles {
  pointer-events: all;
}

.corner-handle {
  fill: white;
  stroke: #667eea;
  stroke-width: 3;
  cursor: grab;
  transition: all 0.2s ease;
}

.corner-handle:hover {
  fill: #667eea;
  r: 10;
  stroke: white;
  stroke-width: 2;
  cursor: grab;
}

.corner-handle:active {
  cursor: grabbing;
}

.corner-label {
  fill: #667eea;
  font-size: 12px;
  font-weight: bold;
  pointer-events: none;
  user-select: none;
}

/* Delete button */
.delete-button {
  cursor: pointer;
  pointer-events: all;
  transition: all 0.3s ease;
}

.delete-button:hover circle {
  fill: #c0392b;
  transform: scale(1.1);
}

.placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
}

.placeholder p {
  color: #999;
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0.5rem 0;
}

.placeholder .hint {
  font-size: 0.9rem;
  color: #bbb;
}

/* Controls */
.controls {
  margin-top: 1.5rem;
  display: grid;
  gap: 1.5rem;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-group label {
  font-weight: 600;
  color: #333;
  font-size: 0.9rem;
}

.slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #ddd;
  outline: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  transition: all 0.3s ease;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 0 0 8px rgba(102, 126, 234, 0.2);
}

.corner-positions {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
}

.corner-info h4 {
  margin: 0 0 0.75rem 0;
  color: #333;
  font-size: 0.9rem;
}

.coords-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #666;
}

.reset-btn {
  padding: 0.75rem 1.5rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.reset-btn:hover {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

@media (max-width: 1024px) {
  .container {
    grid-template-columns: 1fr;
  }
  
  .design-gallery {
    position: static;
  }
  
  .coords-grid {
    grid-template-columns: 1fr;
  }
}
</style>