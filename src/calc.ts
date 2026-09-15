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
        maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount)
}

const HI_MONTHS_SHORT = ["जन", "फर", "मार", "अप्र", "मई", "जून", "जुल", "अग", "सित", "अक्ट", "नव", "दिस"]
const HI_MONTHS_LONG = ["जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"]

function pad2(n: number) {
    return String(n).padStart(2, "0")
}

export function fmtDate(iso: string, dateLocale = "en-GB"): string {
    const d = new Date(iso + "T00:00:00")
    if (dateLocale === "hi-IN") {
        return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`
    }
    return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
    })
}

export function fmtDateShort(iso: string, dateLocale = "en-GB"): string {
    const d = new Date(iso + "T00:00:00")
    if (dateLocale === "hi-IN") {
        return `${pad2(d.getDate())} ${HI_MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`
    }
    return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
    })
}

export function fmtDateFromTimestamp(ts: number, dateLocale = "en-GB"): string {
    const d = new Date(ts)
    if (dateLocale === "hi-IN") {
        return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`
    }
    return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
    })
}

export function fmtMonthYear(ts: number, dateLocale = "en-GB"): string {
    const d = new Date(ts)
    if (dateLocale === "hi-IN") {
        return `${HI_MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`
    }
    return d.toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
    })
}

interface DurationLabels {
    year: string
    month: string
    day: string
}

// Compact duration on 30-day month / 360-day year basis, e.g. 1500d → "4y 2mo"
export function fmtDuration(
    days: number,
    labels: DurationLabels = { year: "y", month: "mo", day: "d" },
): string {
    const years = Math.floor(days / 360)
    const months = Math.floor((days % 360) / 30)
    const rem = days % 30
    const parts: string[] = []
    if (years > 0) parts.push(`${years}${labels.year}`)
    if (months > 0) parts.push(`${months}${labels.month}`)
    if (rem > 0) parts.push(`${rem}${labels.day}`)
    return parts.length > 0 ? parts.join(" ") : `0${labels.day}`
}

export function today(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}

// subtle haptic feedback on success/destructive actions (no-op where unsupported)
export function haptic(pattern: number | number[] = 10) {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
            navigator.vibrate(pattern)
        } catch {
            /* ignore */
        }
    }
}

const SEP = "-".repeat(28)

interface ShareTextLabels {
    summary: string
    duration: string
    principal: string
    interest: string
    totalDue: string
}

export function buildShareText(
    b: SavedBatch,
    labels: ShareTextLabels = {
        summary: "INTEREST SUMMARY",
        duration: "Duration",
        principal: "Principal",
        interest: "Interest",
        totalDue: "Total due",
    },
    dateLocale = "en-GB",
    durationLabels: DurationLabels = { year: "y", month: "mo", day: "d" },
    rateUnit = "%/mo",
): string {
    const dateStr = fmtDateFromTimestamp(b.createdAt, dateLocale)
    const lines: string[] = [
        `\uD83E\uDDFE *${labels.summary}*`,
        `\uD83D\uDCC5 ${dateStr}`,
        SEP,
        "",
    ]
    b.entries.forEach((e, i) => {
        lines.push(
            `${i + 1}. ${fmtINR(e.principal)} @ ${e.ratePerMonth}${rateUnit}`,
            `     ${fmtDateShort(e.startDate, dateLocale)} \u2192 ${fmtDateShort(e.endDate, dateLocale)}`,
            `     ${labels.duration}:  ${fmtDuration(e.days, durationLabels)} \u00b7 ${e.days} days`,
            `     ${labels.interest}:  ${fmtINR(e.interest)}`,
            "",
        )
    })
    lines.push(
        SEP,
        `${labels.principal}     ${fmtINR(b.totalPrincipal)}`,
        `${labels.interest}      ${fmtINR(b.totalInterest)}`,
        SEP,
        `*${labels.totalDue}     ${fmtINR(b.grandTotal)}*`,
    )
    return lines.join("\n")
}
