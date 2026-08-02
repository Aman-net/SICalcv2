import { useEffect, useRef, useState } from "react"
import { getBatches, deleteBatch, type SavedBatch } from "./db"
import {
    fmtINR,
    fmtDateShort,
    fmtDateFromTimestamp,
    buildShareText,
} from "./calc"

interface Props {
    refreshKey: number
}

async function doShare(text: string, onCopied?: () => void) {
    try {
        await navigator.clipboard.writeText(text)
        onCopied?.()
    } catch {
        /* ignore */
    }
    if (navigator.share) {
        try {
            await navigator.share({ title: "Interest Summary", text })
            return
        } catch (err) {
            if (err instanceof DOMException && err.name === "AbortError") return
        }
    }
    window.open(
        `https://wa.me/?text=${encodeURIComponent(text)}`,
        "_blank",
        "noopener",
    )
}

interface BatchCardProps {
    batch: SavedBatch
    isOpen: boolean
    onToggle: () => void
    onDelete: () => void
    onShare: () => void
}

function BatchCard({
    batch,
    isOpen,
    onToggle,
    onDelete,
    onShare,
}: BatchCardProps) {
    const [dragX, setDragX] = useState(0)
    const [dragging, setDragging] = useState(false)
    const startX = useRef<number | null>(null)
    const cardWidth = useRef(0)
    const didDrag = useRef(false)
    const reveal =
        cardWidth.current > 0
            ? Math.min(Math.abs(dragX) / (cardWidth.current * 0.5), 1)
            : 0
    const dateStr = fmtDateFromTimestamp(batch.createdAt)

    function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
        startX.current = e.clientX
        cardWidth.current = e.currentTarget.getBoundingClientRect().width
        didDrag.current = false
        setDragging(true)
    }

    function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
        if (startX.current === null) return
        const dx = e.clientX - startX.current
        if (Math.abs(dx) > 6) didDrag.current = true
        setDragX(Math.min(0, dx))
    }

    function handlePointerUp() {
        if (
            cardWidth.current > 0 &&
            Math.abs(dragX) >= cardWidth.current * 0.5
        ) {
            onDelete()
            return
        }
        startX.current = null
        setDragX(0)
        setDragging(false)
    }

    function handleClickCapture(e: React.MouseEvent<HTMLDivElement>) {
        if (!didDrag.current) return
        e.preventDefault()
        e.stopPropagation()
        didDrag.current = false
    }

    return (
        <div className="relative">
            <div className="absolute inset-y-1.5 right-1.5 left-16 rounded-[20px] overflow-hidden pointer-events-none">
                <div
                    className="h-full w-full bg-gradient-to-l from-red-500 via-rose-500 to-rose-400 flex items-center justify-end px-4 text-white"
                    style={{ opacity: 0.18 + reveal * 0.82 }}
                >
                    <div
                        className="flex items-center gap-2"
                        style={{
                            transform: `translateX(${(1 - reveal) * 14}px)`,
                            opacity: 0.35 + reveal * 0.65,
                        }}
                    >
                        <span className="text-sm leading-none">🗑</span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.18em]">
                            Delete
                        </span>
                    </div>
                </div>
            </div>

            <div
                className="bg-white rounded-2xl shadow-sm shadow-slate-200 border border-slate-100 overflow-hidden touch-pan-y"
                style={{
                    transform: `translateX(${dragX}px)`,
                    transition: dragging ? "none" : "transform 0.2s ease-out",
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onClickCapture={handleClickCapture}
            >
                <button
                    className="w-full px-4 py-3.5 flex items-center gap-3 text-left active:bg-slate-50 transition-colors"
                    onClick={onToggle}
                >
                    <div className="flex-1 min-w-0">
                        <div className="text-base font-semibold text-slate-900 truncate">
                            {dateStr}
                        </div>
                        <div className="mt-2 sm:mt-1">
                            <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-500 px-2.5 py-0.5 text-[10px] font-semibold">
                                {batch.entries.length} loan
                                {batch.entries.length !== 1 ? "s" : ""}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                        <div className="text-right min-w-[92px]">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 mb-0.5">
                                Total due
                            </p>
                            <p className="text-base font-bold text-emerald-600 leading-none">
                                {fmtINR(batch.grandTotal)}
                            </p>
                        </div>
                        <div className="text-right min-w-[76px]">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 mb-0.5">
                                Interest
                            </p>
                            <p className="text-sm font-semibold text-indigo-600 leading-none">
                                {fmtINR(batch.totalInterest)}
                            </p>
                        </div>
                        <span
                            className={`text-slate-300 text-xs transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                        >
                            ▼
                        </span>
                    </div>
                </button>

                {isOpen && (
                    <div className="border-t border-slate-100">
                        <div className="px-3 py-2 space-y-2">
                            {batch.entries.map((e) => {
                                const minBilled = e.days < 30
                                return (
                                    <div
                                        key={e.id}
                                        className="bg-slate-50 rounded-xl overflow-hidden"
                                    >
                                        <div className="flex items-center gap-3 px-3 pt-2.5 pb-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest leading-none mb-0.5">
                                                    Principal
                                                </p>
                                                <p className="text-[17px] font-bold text-slate-800 tracking-tight truncate">
                                                    {fmtINR(e.principal)}
                                                </p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest leading-none mb-0.5">
                                                    Interest
                                                </p>
                                                <p className="text-sm font-bold text-indigo-600 leading-none">
                                                    {fmtINR(e.interest)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-3 pb-2.5 text-sm text-slate-400">
                                            <span className="bg-white text-slate-500 text-xs font-semibold px-1.5 py-0.5 rounded-full shrink-0 border border-slate-100">
                                                {e.ratePerMonth}%/mo
                                            </span>
                                            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-600 border border-slate-200/80">
                                                <span className="truncate">
                                                    {fmtDateShort(e.startDate)}
                                                </span>
                                                <span className="text-slate-300 shrink-0">
                                                    →
                                                </span>
                                                <span className="truncate">
                                                    {fmtDateShort(e.endDate)}
                                                </span>
                                            </span>
                                            <span
                                                className={`ml-auto shrink-0 text-sm font-semibold px-2.5 py-1 rounded-full ${
                                                    minBilled
                                                        ? "bg-amber-50 text-amber-500"
                                                        : "bg-indigo-50 text-indigo-400"
                                                }`}
                                            >
                                                {minBilled
                                                    ? `${e.days}d→30d`
                                                    : `${e.days}d`}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="px-3 pb-3 flex gap-2">
                            <button
                                onClick={onShare}
                                className="flex-1 h-11 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold active:scale-95 transition-transform shadow-sm shadow-emerald-200"
                            >
                                Share Again
                            </button>
                            <button
                                onClick={onDelete}
                                className="h-11 px-4 rounded-2xl bg-red-50 text-red-400 text-sm font-semibold active:scale-95 transition-transform"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function History({ refreshKey }: Props) {
    const [batches, setBatches] = useState<SavedBatch[]>([])
    const [expanded, setExpanded] = useState<string | null>(null)
    const [toast, setToast] = useState("")

    function showToast(msg: string) {
        setToast(msg)
        setTimeout(() => setToast(""), 2500)
    }

    useEffect(() => {
        getBatches().then(setBatches)
    }, [refreshKey])

    async function handleDelete(id: string) {
        await deleteBatch(id)
        setBatches((prev) => prev.filter((b) => b.id !== id))
        if (expanded === id) setExpanded(null)
    }

    if (batches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-3">
                <span className="text-6xl">📋</span>
                <p className="text-sm">No saved calculations yet</p>
            </div>
        )
    }

    return (
        <div className="overflow-y-auto thin-scrollbar px-4 pt-4 pb-24 space-y-3">
            {batches.map((b) => {
                const isOpen = expanded === b.id

                return (
                    <BatchCard
                        key={b.id}
                        batch={b}
                        isOpen={isOpen}
                        onToggle={() => setExpanded(isOpen ? null : b.id)}
                        onDelete={() => handleDelete(b.id)}
                        onShare={() =>
                            doShare(buildShareText(b), () =>
                                showToast("Copied ✓"),
                            )
                        }
                    />
                )
            })}
            {/* ── Toast notification ── */}
            {toast && (
                <div
                    className="fixed bottom-8 left-1/2 z-50 bg-slate-800/90 backdrop-blur-sm text-white text-xs font-semibold px-5 py-2.5 rounded-full shadow-xl pointer-events-none"
                    style={{
                        animation: "toastIn 0.2s ease-out",
                        transform: "translateX(-50%)",
                    }}
                >
                    {toast}
                </div>
            )}
        </div>
    )
}
