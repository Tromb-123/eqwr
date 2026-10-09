// Zakat calculation rules and precious-metal prices.
//
// Rules (agreed across the main schools; see the notice shown on the page):
//  - Nisab (minimum wealth): 20 dinars of gold = 85 g, or 200 dirhams of silver = 595 g.
//    Hadith: Abu Dawud 1573 (gold), Abu Dawud (silver), al-Bukhari 1454 (rate).
//  - Rate: 2.5% (a quarter of a tenth).
//  - Hawl: the wealth must stay at or above the nisab for one full lunar year.
//  - Scholars differ on whether to measure the nisab by gold or by silver
//    (the Hanafi school uses silver; the others use gold). The user picks one.
//
// Prices: the Bank of Russia publishes accounting prices of refined metals in rubles per gram
// (https://www.cbr.ru/scripts/xml_metall.asp). The snapshot below is the last value taken from it
// when this file was written; the app tries to refresh it and falls back to the snapshot.

export const NISAB_GOLD_GRAMS = 85
export const NISAB_SILVER_GRAMS = 595
export const ZAKAT_RATE = 0.025

export type NisabStandard = "gold" | "silver"

export type MetalPrices = {
  goldPerGram: number
  silverPerGram: number
  date: string // ISO yyyy-mm-dd
  source: "cbr-live" | "snapshot"
}

export const PRICE_SNAPSHOT: MetalPrices = {
  goldPerGram: 11246.9,
  silverPerGram: 165.01,
  date: "2026-10-09",
  source: "snapshot",
}

export type ZakatInput = {
  cash: number // money, savings, receivables you expect to get back
  goldGrams: number // grams of pure gold
  silverGrams: number // grams of pure silver
  otherAssets: number // trade goods, investments (market value)
  debts: number // debts you must repay
  deductions: number // other amounts that may be deducted
  goldPerGram: number
  silverPerGram: number
  standard: NisabStandard
  hawlComplete: boolean // wealth stayed above the nisab for a full lunar year
}

export type ZakatResult = {
  goldValue: number
  silverValue: number
  totalAssets: number
  totalDeductions: number
  netWealth: number
  nisabValue: number
  nisabGrams: number
  aboveNisab: boolean
  difference: number // net wealth minus nisab (negative = below)
  status: "below-nisab" | "waiting-hawl" | "due"
  zakatDue: number
  // what the amount would be if the full year had passed (shown while waiting for the hawl)
  zakatIfHawlComplete: number
}

function positive(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculateZakat(input: ZakatInput): ZakatResult {
  const goldValue = positive(input.goldGrams) * positive(input.goldPerGram)
  const silverValue = positive(input.silverGrams) * positive(input.silverPerGram)
  const totalAssets = positive(input.cash) + goldValue + silverValue + positive(input.otherAssets)
  const totalDeductions = positive(input.debts) + positive(input.deductions)
  const netWealth = Math.max(0, totalAssets - totalDeductions)

  const nisabGrams = input.standard === "gold" ? NISAB_GOLD_GRAMS : NISAB_SILVER_GRAMS
  const pricePerGram = input.standard === "gold" ? positive(input.goldPerGram) : positive(input.silverPerGram)
  const nisabValue = nisabGrams * pricePerGram

  // With no valid price the nisab cannot be known, so nothing is reported as due.
  const aboveNisab = nisabValue > 0 && netWealth >= nisabValue
  const zakatIfHawlComplete = aboveNisab ? netWealth * ZAKAT_RATE : 0

  const status: ZakatResult["status"] = !aboveNisab
    ? "below-nisab"
    : input.hawlComplete
      ? "due"
      : "waiting-hawl"

  return {
    goldValue: round2(goldValue),
    silverValue: round2(silverValue),
    totalAssets: round2(totalAssets),
    totalDeductions: round2(totalDeductions),
    netWealth: round2(netWealth),
    nisabValue: round2(nisabValue),
    nisabGrams,
    aboveNisab,
    difference: round2(netWealth - nisabValue),
    status,
    zakatDue: status === "due" ? round2(zakatIfHawlComplete) : 0,
    zakatIfHawlComplete: round2(zakatIfHawlComplete),
  }
}

// --- Bank of Russia prices ------------------------------------------------

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function cbrDate(date: Date) {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
}

// Parses the Bank of Russia XML. Codes: 1 = gold, 2 = silver. Prices use a decimal comma.
// Returns the most recent date that has both gold and silver.
export function parseCbrMetals(xml: string): MetalPrices | null {
  const doc = new DOMParser().parseFromString(xml, "text/xml")
  if (doc.querySelector("parsererror")) return null

  const byDate = new Map<string, { gold?: number; silver?: number }>()
  doc.querySelectorAll("Record").forEach((record) => {
    const date = record.getAttribute("Date") // dd.mm.yyyy
    const code = record.getAttribute("Code")
    const sell = record.querySelector("Sell")?.textContent ?? ""
    const price = Number(sell.replace(/\s/g, "").replace(",", "."))
    if (!date || !Number.isFinite(price) || price <= 0) return
    const entry = byDate.get(date) ?? {}
    if (code === "1") entry.gold = price
    if (code === "2") entry.silver = price
    byDate.set(date, entry)
  })

  let best: { iso: string; gold: number; silver: number } | null = null
  byDate.forEach((entry, date) => {
    if (entry.gold === undefined || entry.silver === undefined) return
    const [dd, mm, yyyy] = date.split(".")
    const iso = `${yyyy}-${mm}-${dd}`
    if (!best || iso > best.iso) best = { iso, gold: entry.gold, silver: entry.silver }
  })
  if (!best) return null

  const found = best as { iso: string; gold: number; silver: number }
  // Reject values that are clearly wrong (a unit mix-up or a broken response).
  if (found.gold < 500 || found.gold > 200000 || found.silver < 5 || found.silver > 5000) return null
  return { goldPerGram: found.gold, silverPerGram: found.silver, date: found.iso, source: "cbr-live" }
}

let pricesPromise: Promise<MetalPrices> | null = null

// Tries the Bank of Russia first; on any failure (network, blocked by the browser, bad data)
// returns the snapshot, so the calculator always works.
export function loadMetalPrices(): Promise<MetalPrices> {
  pricesPromise ??= (async () => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 6000)
    try {
      const to = new Date()
      const from = new Date(to.getTime() - 14 * 24 * 60 * 60 * 1000)
      const url = `https://www.cbr.ru/scripts/xml_metall.asp?date_req1=${cbrDate(from)}&date_req2=${cbrDate(to)}`
      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok) throw new Error(`CBR request failed: ${response.status}`)
      // The file is windows-1251, not UTF-8.
      const text = new TextDecoder("windows-1251").decode(await response.arrayBuffer())
      const parsed = parseCbrMetals(text)
      if (!parsed) throw new Error("CBR response could not be read")
      return parsed
    } catch {
      return PRICE_SNAPSHOT
    } finally {
      clearTimeout(timer)
    }
  })()
  return pricesPromise
}
