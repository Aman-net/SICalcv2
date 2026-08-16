import type { SavedBatch } from "./db"

export interface CalcResult {
    days: number
    interest: number
    total: number
}

// SI = P × (R/100) × (days/30) — Indian moneylender convention (30-day month basis)
export function calcSI(
    principal: number,
    ratePerMonth: number,
    startDate: string,
    endDate: string,
): CalcResult {
    const days = Math.max(
        0,
        Math.round(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) /
                86_400_000,
        ),
    )
    // loans under 30 days are billed as a full month
    const billableDays = Math.max(days, 30)
    const interest = Math.round(
        principal * (ratePerMonth / 100) * (billableDays / 30),
    )
    return { days, interest, total: principal + interest }
}

export function fmtINR(amount: number): string {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount)
}

export function fmtDate(iso: string): string {
    // force midnight local to avoid timezone-off-by-one on date display
    return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
    })
}

export function fmtDateShort(iso: string): string {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
    })
}

export function fmtDateFromTimestamp(ts: number): string {
    return new Date(ts).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
    })
}

// Compact duration on 30-day month / 360-day year basis, e.g. 1500d → "4y 2mo"
export function fmtDuration(days: number): string {
    const years = Math.floor(days / 360)
    const months = Math.floor((days % 360) / 30)
    const rem = days % 30
    const parts: string[] = []
    if (years > 0) parts.push(`${years}y`)
    if (months > 0) parts.push(`${months}mo`)
    if (rem > 0) parts.push(`${rem}d`)
    return parts.length > 0 ? parts.join(" ") : "0d"
}

export function today(): string {
    return new Date().toISOString().slice(0, 10)
}

const SEP =
    "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"

export function buildShareText(b: SavedBatch): string {
    const dateStr = fmtDateFromTimestamp(b.createdAt)
    const lines: string[] = [
        `\uD83E\uDDFE Interest summary`,
        `\uD83D\uDCC5 ${dateStr}`,
        SEP,
        "",
    ]
    b.entries.forEach((e, i) => {
        lines.push(
            `${i + 1}. ${fmtINR(e.principal)} @ ${e.ratePerMonth}%/mo`,
            `   ${fmtDate(e.startDate)} \u2192 ${fmtDate(e.endDate)} (${fmtDuration(e.days)} · ${e.days} days)`,
            `   Interest: ${fmtINR(e.interest)}`,
            "",
        )
    })
    lines.push(
        SEP,
        `Principal: ${fmtINR(b.totalPrincipal)}`,
        `Interest: ${fmtINR(b.totalInterest)}`,
        SEP,
        `Total due: ${fmtINR(b.grandTotal)}`,
    )
    return lines.join("\n")
}
