<script setup lang="ts">
// ─── Types ────────────────────────────────────────────────────────────────────
type Suit   = '♠' | '♥' | '♦' | '♣'
type Rank   = 'A'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K'
interface Card { suit: Suit; rank: Rank; faceUp: boolean }

interface Selection {
  area: 'tableau' | 'waste' | 'foundation'
  col: number    // tableau column or foundation pile index
  cardIdx: number // index within the column (-1 for waste top / foundation top)
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SUITS: Suit[]  = ['♠','♥','♦','♣']
const RANKS: Rank[]  = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']
const RANK_VAL: Record<Rank, number> = {
  A:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,10:10,J:11,Q:12,K:13,
}
function isRed(suit: Suit): boolean { return suit === '♥' || suit === '♦' }

// ─── Sounds ───────────────────────────────────────────────────────────────────
const { move: sfxMove, wrong: sfxWrong, score: sfxScore, win: sfxWin, click: sfxClick } = useGameSounds()

// ─── Game State ───────────────────────────────────────────────────────────────
const gameState   = ref<'idle' | 'playing' | 'won'>('idle')
const tableau     = ref<Card[][]>([])        // 7 columns
const stock       = ref<Card[]>([])          // draw pile (top = last)
const waste       = ref<Card[]>([])          // flipped pile (top = last)
const foundations = ref<Card[][]>([[], [], [], []])  // 4 piles (top = last)
const selection   = ref<Selection | null>(null)
const stockCycles = ref(0)
const score       = ref(0)

// ─── Deck helpers ─────────────────────────────────────────────────────────────
function buildDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ suit, rank, faceUp: false })
  return deck
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

// ─── Deal ─────────────────────────────────────────────────────────────────────
function deal() {
  const deck = shuffle(buildDeck())
  const tab: Card[][] = []
  let di = 0
  for (let col = 0; col < 7; col++) {
    const column: Card[] = []
    for (let row = 0; row <= col; row++) {
      const card = { ...deck[di++]!, faceUp: row === col }
      column.push(card)
    }
    tab.push(column)
  }
  tableau.value    = tab
  stock.value      = deck.slice(di).map(c => ({ ...c, faceUp: false }))
  waste.value      = []
  foundations.value = [[], [], [], []]
  stockCycles.value = 0
  selection.value  = null
  score.value      = 0
}

function startGame() {
  deal()
  gameState.value = 'playing'
}

function restart() { startGame() }

// ─── Move validation ──────────────────────────────────────────────────────────
function canPlaceOnTableau(card: Card, col: number): boolean {
  const column = tableau.value[col]!
  if (column.length === 0) return card.rank === 'K'
  const top = column[column.length - 1]!
  if (!top.faceUp) return false
  return isRed(card.suit) !== isRed(top.suit) && RANK_VAL[card.rank] === RANK_VAL[top.rank] - 1
}

function canPlaceOnFoundation(card: Card, pileIdx: number): boolean {
  const pile = foundations.value[pileIdx]!
  if (pile.length === 0) return card.rank === 'A'
  const top = pile[pile.length - 1]!
  return top.suit === card.suit && RANK_VAL[card.rank] === RANK_VAL[top.rank] + 1
}

function foundationIdxForSuit(suit: Suit): number {
  // Try to find existing pile with same suit
  for (let i = 0; i < 4; i++) {
    if (foundations.value[i]!.length > 0 && foundations.value[i]![0]!.suit === suit) return i
  }
  // Otherwise first empty pile
  for (let i = 0; i < 4; i++) { if (foundations.value[i]!.length === 0) return i }
  return -1
}

// ─── Auto-move to foundation ──────────────────────────────────────────────────
function tryAutoFoundation(card: Card): boolean {
  const fi = foundationIdxForSuit(card.suit)
  if (fi >= 0 && canPlaceOnFoundation(card, fi)) return true
  return false
}

// ─── Stock ────────────────────────────────────────────────────────────────────
function clickStock() {
  if (gameState.value !== 'playing') return
  selection.value = null
  if (stock.value.length === 0) {
    if (waste.value.length === 0) return
    // Recycle waste into stock
    stock.value = waste.value.map(c => ({ ...c, faceUp: false })).reverse()
    waste.value = []
    stockCycles.value++
    sfxClick()
    return
  }
  const card = { ...stock.value.pop()!, faceUp: true }
  waste.value = [...waste.value, card]
  sfxClick()
}

// ─── Selection logic ──────────────────────────────────────────────────────────
function selectWaste() {
  if (gameState.value !== 'playing') return
  if (waste.value.length === 0) return
  if (selection.value?.area === 'waste') { selection.value = null; return }
  selection.value = { area: 'waste', col: 0, cardIdx: waste.value.length - 1 }
}

function selectFoundation(fi: number) {
  if (gameState.value !== 'playing') return
  if (foundations.value[fi]!.length === 0) return
  if (selection.value?.area === 'foundation' && selection.value.col === fi) {
    selection.value = null; return
  }
  selection.value = { area: 'foundation', col: fi, cardIdx: foundations.value[fi]!.length - 1 }
}

function selectTableauCard(col: number, cardIdx: number) {
  if (gameState.value !== 'playing') return
  const column = tableau.value[col]!
  const card = column[cardIdx]
  if (!card) return

  // Flip face-down card if it's the last
  if (!card.faceUp) {
    if (cardIdx === column.length - 1) {
      tableau.value[col]![cardIdx] = { ...card, faceUp: true }
      sfxClick()
    }
    return
  }

  // Deselect if clicking same card
  if (selection.value?.area === 'tableau' && selection.value.col === col && selection.value.cardIdx === cardIdx) {
    selection.value = null; return
  }

  // If something is selected, try to move it here
  if (selection.value) {
    const moved = tryMove(col, cardIdx)
    if (!moved) {
      // Reselect this card instead
      selection.value = { area: 'tableau', col, cardIdx }
    }
    return
  }

  selection.value = { area: 'tableau', col, cardIdx }
}

// ─── Move execution ───────────────────────────────────────────────────────────
function tryMove(destCol: number, destCardIdx: number): boolean {
  const sel = selection.value
  if (!sel) return false

  // Get card(s) being moved
  let movingCards: Card[] = []
  if (sel.area === 'waste') {
    if (waste.value.length === 0) return false
    movingCards = [waste.value[waste.value.length - 1]!]
  } else if (sel.area === 'foundation') {
    const pile = foundations.value[sel.col]!
    if (pile.length === 0) return false
    movingCards = [pile[pile.length - 1]!]
  } else {
    const column = tableau.value[sel.col]!
    movingCards = column.slice(sel.cardIdx)
  }

  if (movingCards.length === 0) return false

  // Validate placement on tableau
  const targetColumn = tableau.value[destCol]!
  const isEmpty = targetColumn.length === 0
  const targetTop = isEmpty ? null : targetColumn[targetColumn.length - 1]!

  // Moving onto a specific card vs. empty column
  if (!isEmpty && destCardIdx !== targetColumn.length - 1) return false

  if (!canPlaceOnTableau(movingCards[0]!, destCol)) {
    sfxWrong(); selection.value = null; return false
  }

  // Execute move
  if (sel.area === 'waste') {
    waste.value = waste.value.slice(0, -1)
  } else if (sel.area === 'foundation') {
    foundations.value[sel.col] = foundations.value[sel.col]!.slice(0, -1)
  } else {
    tableau.value[sel.col] = tableau.value[sel.col]!.slice(0, sel.cardIdx)
    // Flip newly exposed card
    const srcCol = tableau.value[sel.col]!
    if (srcCol.length > 0 && !srcCol[srcCol.length - 1]!.faceUp) {
      srcCol[srcCol.length - 1] = { ...srcCol[srcCol.length - 1]!, faceUp: true }
    }
  }

  tableau.value[destCol] = [...targetColumn, ...movingCards]
  sfxMove()
  selection.value = null
  return true
}

function moveToFoundation(fi: number) {
  const sel = selection.value
  if (!sel) return

  let card: Card | null = null
  if (sel.area === 'waste') {
    card = waste.value[waste.value.length - 1] ?? null
  } else if (sel.area === 'tableau') {
    const column = tableau.value[sel.col]!
    // Can only move single card to foundation
    if (sel.cardIdx !== column.length - 1) { sfxWrong(); selection.value = null; return }
    card = column[column.length - 1] ?? null
  } else if (sel.area === 'foundation') {
    // Moving from one foundation to another — unusual but allowed if valid
    card = foundations.value[sel.col]![foundations.value[sel.col]!.length - 1] ?? null
  }

  if (!card) { sfxWrong(); selection.value = null; return }
  if (!canPlaceOnFoundation(card, fi)) { sfxWrong(); selection.value = null; return }

  // Execute
  if (sel.area === 'waste') {
    waste.value = waste.value.slice(0, -1)
  } else if (sel.area === 'tableau') {
    const srcCol = tableau.value[sel.col]!
    tableau.value[sel.col] = srcCol.slice(0, -1)
    const col = tableau.value[sel.col]!
    if (col.length > 0 && !col[col.length - 1]!.faceUp) {
      col[col.length - 1] = { ...col[col.length - 1]!, faceUp: true }
    }
  } else {
    foundations.value[sel.col] = foundations.value[sel.col]!.slice(0, -1)
  }

  foundations.value[fi] = [...foundations.value[fi]!, card]
  score.value++
  sfxScore()
  selection.value = null

  // Check win
  if (foundations.value.every(p => p.length === 13)) {
    score.value = 52
    sfxWin()
    gameState.value = 'won'
  }
}

// ─── Click handlers ───────────────────────────────────────────────────────────
function clickTableauColumn(col: number, cardIdx: number) {
  if (gameState.value !== 'playing') return
  const sel = selection.value

  // If something is selected and we click a column area — try to move
  if (sel) {
    const moved = tryMove(col, cardIdx)
    if (!moved && !selection.value) {
      // tryMove already cleared selection on failure — just try selecting new card
    }
    if (!moved) {
      // Try selecting the clicked card instead
      const card = tableau.value[col]?.[cardIdx]
      if (card?.faceUp) selection.value = { area: 'tableau', col, cardIdx }
    }
    return
  }

  selectTableauCard(col, cardIdx)
}

function clickEmptyTableauColumn(col: number) {
  if (gameState.value !== 'playing') return
  if (!selection.value) return
  tryMove(col, -1)
}

function clickFoundationPile(fi: number) {
  if (gameState.value !== 'playing') return
  const sel = selection.value
  if (sel) {
    // Try to place selected card on this foundation
    moveToFoundation(fi)
    return
  }
  selectFoundation(fi)
}

// ─── Computed helpers ─────────────────────────────────────────────────────────
const totalFoundation = computed(() => foundations.value.reduce((s, p) => s + p.length, 0))

function isSelected(area: Selection['area'], col: number, cardIdx: number): boolean {
  if (!selection.value) return false
  if (selection.value.area !== area || selection.value.col !== col) return false
  if (area === 'tableau') return cardIdx >= selection.value.cardIdx
  return true
}

function cardColorClass(card: Card): string {
  return isRed(card.suit) ? 'text-red-400' : 'text-white'
}

function cardBgClass(card: Card, selected: boolean): string {
  if (selected) return 'bg-neon-blue/20 border-neon-blue shadow-[0_0_8px_rgba(0,212,255,0.4)]'
  return 'bg-slate-800 border-slate-600'
}

const CARD_HEIGHT = 20  // px offset per stacked card
</script>

<template>
  <div class="flex flex-col items-center gap-4 select-none">

    <!-- Idle -->
    <div v-if="gameState === 'idle'" class="flex flex-col items-center gap-4">
      <p class="font-mono text-xs text-slate-400 text-center max-w-xs leading-relaxed">
        Klondike Solitaire. Build 4 foundation piles by suit from Ace to King.<br>
        <span class="text-neon-blue">Click to select · Click destination to move</span><br>
        Tableau: descending rank, alternating colors.
      </p>
      <button class="btn-neon-blue mt-2" @click="startGame">START GAME</button>
    </div>

    <!-- Playing -->
    <div v-else class="relative flex flex-col items-center gap-3 w-full" style="max-width: 640px">

      <!-- HUD -->
      <div class="flex gap-5 glass-hud px-4 py-2 rounded-lg w-full justify-between">
        <div class="text-center">
          <p class="hud-label">STOCK</p>
          <p class="font-mono font-bold text-sm text-slate-400">{{ stock.length }}</p>
        </div>
        <div class="text-center">
          <p class="hud-label">WASTE</p>
          <p class="font-mono font-bold text-sm text-slate-400">{{ waste.length }}</p>
        </div>
        <div class="text-center">
          <p class="hud-label">FOUNDATIONS</p>
          <p class="font-mono font-bold text-sm text-neon-emerald">{{ totalFoundation }}/52</p>
        </div>
        <div class="text-center">
          <p class="hud-label">CYCLES</p>
          <p class="font-mono font-bold text-sm text-slate-500">{{ stockCycles }}</p>
        </div>
      </div>

      <!-- Top row: Stock + Waste + Foundations -->
      <div class="flex items-start gap-2 w-full px-1">

        <!-- Stock -->
        <button
          class="w-14 h-20 flex items-center justify-center rounded border-2 font-mono text-lg transition-all flex-shrink-0"
          :class="stock.length > 0
            ? 'bg-slate-700 border-slate-500 text-slate-300 hover:bg-slate-600 cursor-pointer'
            : 'bg-slate-900 border-slate-700 text-slate-600 cursor-pointer'"
          @click="clickStock"
        >
          {{ stock.length > 0 ? '🂠' : '↺' }}
        </button>

        <!-- Waste top card -->
        <button
          class="w-14 h-20 flex flex-col items-center justify-center rounded border-2 font-mono text-sm transition-all flex-shrink-0"
          :class="waste.length > 0
            ? [
                cardColorClass(waste[waste.length-1]!),
                isSelected('waste', 0, waste.length-1)
                  ? 'bg-neon-blue/20 border-neon-blue shadow-[0_0_8px_rgba(0,212,255,0.4)]'
                  : 'bg-slate-800 border-slate-600 hover:border-slate-400',
                'cursor-pointer'
              ]
            : 'bg-slate-900 border-slate-800 text-slate-700 cursor-default'"
          @click="selectWaste"
        >
          <template v-if="waste.length > 0">
            <span class="text-xs font-bold leading-none">{{ waste[waste.length-1]!.rank }}</span>
            <span class="text-base leading-none">{{ waste[waste.length-1]!.suit }}</span>
          </template>
          <span v-else class="text-slate-700 text-xs">WASTE</span>
        </button>

        <!-- Spacer -->
        <div class="flex-1" />

        <!-- Foundation piles -->
        <button
          v-for="fi in 4"
          :key="fi"
          class="w-14 h-20 flex flex-col items-center justify-center rounded border-2 font-mono text-sm transition-all flex-shrink-0 cursor-pointer"
          :class="foundations[fi-1]!.length > 0
            ? [
                cardColorClass(foundations[fi-1]![foundations[fi-1]!.length-1]!),
                isSelected('foundation', fi-1, foundations[fi-1]!.length-1)
                  ? 'bg-neon-blue/20 border-neon-blue shadow-[0_0_8px_rgba(0,212,255,0.4)]'
                  : 'bg-neon-emerald/10 border-neon-emerald/30 hover:border-neon-emerald/60'
              ]
            : 'bg-slate-900 border-slate-700 text-slate-600 hover:border-slate-500'"
          @click="clickFoundationPile(fi-1)"
        >
          <template v-if="foundations[fi-1]!.length > 0">
            <span class="text-xs font-bold leading-none">{{ foundations[fi-1]![foundations[fi-1]!.length-1]!.rank }}</span>
            <span class="text-base leading-none">{{ foundations[fi-1]![foundations[fi-1]!.length-1]!.suit }}</span>
          </template>
          <span v-else class="text-slate-600 text-lg">{{ SUITS[fi-1] }}</span>
        </button>
      </div>

      <!-- Tableau -->
      <div class="flex gap-1.5 w-full px-1 items-start">
        <div
          v-for="(column, col) in tableau"
          :key="col"
          class="flex-1 relative"
          :style="{ minHeight: column.length > 0 ? `${80 + (column.length - 1) * CARD_HEIGHT}px` : '80px' }"
        >
          <!-- Empty column placeholder -->
          <div
            v-if="column.length === 0"
            class="absolute inset-0 max-h-20 rounded border-2 border-dashed border-slate-700 flex items-center justify-center cursor-pointer hover:border-slate-500 transition-colors"
            @click="clickEmptyTableauColumn(col)"
          >
            <span class="text-slate-700 text-xs font-mono">K</span>
          </div>

          <!-- Stacked cards -->
          <button
            v-for="(card, ci) in column"
            :key="ci"
            class="absolute w-full rounded border font-mono text-xs transition-all duration-100 cursor-pointer"
            :style="{
              top: `${ci * CARD_HEIGHT}px`,
              height: ci === column.length - 1 ? '80px' : `${CARD_HEIGHT + 4}px`,
              zIndex: ci + 1,
            }"
            :class="[
              card.faceUp
                ? [cardColorClass(card), cardBgClass(card, isSelected('tableau', col, ci))]
                : 'bg-slate-700 border-slate-600 text-slate-500 cursor-pointer',
            ]"
            @click="clickTableauColumn(col, ci)"
          >
            <template v-if="card.faceUp">
              <div class="flex flex-col items-start justify-start p-0.5 h-full">
                <span class="font-bold text-[10px] leading-none">{{ card.rank }}</span>
                <span class="text-xs leading-none">{{ card.suit }}</span>
              </div>
            </template>
            <template v-else>
              <div class="w-full h-full flex items-center justify-center opacity-50">
                <span class="text-[8px]">▪▪▪</span>
              </div>
            </template>
          </button>
        </div>
      </div>

      <!-- Selection hint -->
      <p class="font-mono text-[10px] text-slate-600 text-center">
        <template v-if="selection">
          <span class="text-neon-blue">Card selected</span> — click destination to move · click same card to deselect
        </template>
        <template v-else>
          Click a face-up card to select it · Click stock to draw
        </template>
      </p>

      <!-- Result overlay -->
      <GameResultOverlay
        v-if="gameState === 'won'"
        state="won"
        :score="score"
        extra="All cards to foundations!"
        @restart="restart"
      />
    </div>
  </div>
</template>
