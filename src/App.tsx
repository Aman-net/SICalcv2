import { useEffect, useState } from "react"
import BatchWorkspace from "./BatchWorkspace"
import History from "./History"
import { getRate, saveRate } from "./db"
import { haptic } from "./calc"
import {
    initAnalytics,
    sendPageView,
    logEvent,
    trackAppOpen,
    trackInstallPrompt,
    trackInstallAccepted,
    trackAppInstalled,
} from "./analytics"

type Tab = "calculator" | "history"

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

export default function App() {
    const [tab, setTab] = useState<Tab>("calculator")
    const [rate, setRate] = useState(2)
    const [showSettings, setShowSettings] = useState(false)
    const [settingsRate, setSettingsRate] = useState("")
    const [historyKey, setHistoryKey] = useState(0)
    const [installPrompt, setInstallPrompt] =
        useState<BeforeInstallPromptEvent | null>(null)
    const [isInstalled, setIsInstalled] = useState(false)
    const [showInstallBanner, setShowInstallBanner] = useState(true)

    useEffect(() => {
        getRate().then((r) => {
            setRate(r)
            setSettingsRate(String(r))
        })
    }, [])

    useEffect(() => {
        initAnalytics()
        trackAppOpen()
        sendPageView(tab === "calculator" ? "/calculator" : "/history")
    }, [])

    useEffect(() => {
        sendPageView(tab === "calculator" ? "/calculator" : "/history")
        logEvent("tab_navigation", { tab })
    }, [tab])

    useEffect(() => {
        const standalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            Boolean(
                (navigator as Navigator & { standalone?: boolean }).standalone,
            )
        setIsInstalled(standalone)

        function handleBeforeInstallPrompt(e: Event) {
            e.preventDefault()
            trackInstallPrompt()
            setInstallPrompt(e as BeforeInstallPromptEvent)
        }

        function handleInstalled() {
            trackAppInstalled()
            setIsInstalled(true)
            setInstallPrompt(null)
            setShowInstallBanner(false)
        }

        window.addEventListener(
            "beforeinstallprompt",
            handleBeforeInstallPrompt,
        )
        window.addEventListener("appinstalled", handleInstalled)
        return () => {
            window.removeEventListener(
                "beforeinstallprompt",
                handleBeforeInstallPrompt,
            )
            window.removeEventListener("appinstalled", handleInstalled)
        }
    }, [])

    async function handleSaveSettings() {
        const r = parseFloat(settingsRate)
        if (isNaN(r) || r <= 0) return
        await saveRate(r)
        haptic()
        setRate(r)
        setShowSettings(false)
    }

    function handleBatchSaved() {
        setHistoryKey((k) => k + 1)
    }

    function openSettings() {
        logEvent("settings_opened")
        setSettingsRate(String(rate))
        setShowSettings(true)
    }

    async function handleInstallApp() {
        if (!installPrompt) return
        await installPrompt.prompt()
        const { outcome } = await installPrompt.userChoice
        if (outcome === "accepted") {
            trackInstallAccepted()
            setShowInstallBanner(false)
        }
        setInstallPrompt(null)
    }

    return (
        <div className="h-full flex flex-col bg-slate-50 max-w-lg mx-auto relative">
            {/* ── Header ── */}
            <header className="relative shrink-0 pt-safe pb-2.5 px-4 bg-indigo-600 text-white">
                    <div
                        className="absolute inset-0 bg-gradient-to-b from-transparent to-violet-600 pointer-events-none"
                        aria-hidden="true"
                    />
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-base font-black leading-none shadow-inner">
                                %
                            </div>
                            <h1 className="text-lg font-black tracking-tight leading-none">
                                SI Calc
                            </h1>
                        </div>
                        <button
                            onClick={openSettings}
                            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 active:scale-90 transition-all"
                            aria-label="Settings"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                width="18"
                                height="18"
                                fill="currentColor"
                                aria-hidden="true"
                            >
                                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.61 3.61 0 0 1 8.4 12c0-1.98 1.62-3.6 3.6-3.6s3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                            </svg>
                        </button>
                    </div>
                </header>

            {installPrompt && !isInstalled && showInstallBanner && (
                <div className="shrink-0 px-4 pt-3">
                    <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 flex items-center gap-3 shadow-sm shadow-emerald-100/60">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800">
                                Install SI Calc
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Add it to your home screen for faster offline
                                use.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowInstallBanner(false)}
                            className="h-9 px-3 rounded-xl bg-white/80 text-slate-500 text-xs font-semibold active:scale-95 transition-transform"
                        >
                            Later
                        </button>
                        <button
                            onClick={handleInstallApp}
                            className="h-9 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold active:scale-95 transition-transform shadow-sm shadow-emerald-200"
                        >
                            Install
                        </button>
                    </div>
                </div>
            )}

            {/* ── Tab Bar ── */}
            <div className="shrink-0 bg-white border-b border-slate-100 flex">
                {(["calculator", "history"] as Tab[]).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                            tab === t
                                ? "text-indigo-600 border-b-2 border-indigo-600"
                                : "text-slate-400 hover:text-slate-600"
                        }`}
                    >
                        {t === "calculator" ? "🧮 Calculator" : "📋 History"}
                    </button>
                ))}
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <div
                    className={`flex-1 min-h-0 tab-anim ${tab === "calculator" ? "block" : "hidden"}`}
                >
                    <BatchWorkspace
                        defaultRate={rate}
                        onBatchSaved={handleBatchSaved}
                    />
                </div>
                <div
                    className={`flex-1 min-h-0 tab-anim ${tab === "history" ? "block" : "hidden"}`}
                >
                    <History refreshKey={historyKey} />
                </div>
            </div>

            <div className="shrink-0 px-4 py-1 text-center text-[11px] text-slate-400">
                Made with ❤️ by Aman
            </div>

            {/* ── Settings Bottom Sheet ── */}
            {showSettings && (
                <div
                    className="absolute inset-0 z-50 bg-black/50 flex items-end backdrop-blur-sm"
                    onClick={() => setShowSettings(false)}
                >
                    <div
                        className="w-full bg-white rounded-t-3xl px-6 pt-3 pb-8 space-y-5"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            animation:
                                "slideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
                        }}
                    >
                        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto" />
                        <h2 className="text-lg font-bold text-slate-800">
                            Settings
                        </h2>

                        <div>
                            <label className="text-sm font-medium text-slate-600 block mb-2">
                                Default Interest Rate
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={settingsRate}
                                    onChange={(e) =>
                                        setSettingsRate(e.target.value)
                                    }
                                    onKeyDown={(e) =>
                                        e.key === "Enter" &&
                                        handleSaveSettings()
                                    }
                                    className="w-full h-14 px-4 pr-20 rounded-2xl bg-slate-50 border-2 border-slate-200 text-2xl font-bold text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors"
                                    autoFocus
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">
                                    %/month
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1.5">
                                Pre-fills the rate on every new loan entry
                            </p>
                        </div>

                        <button
                            onClick={handleSaveSettings}
                            className="w-full h-12 bg-indigo-600 text-white rounded-2xl font-semibold text-base active:scale-95 transition-transform"
                        >
                            Save
                        </button>
                        <p className="text-xs text-slate-400 mt-2">
                            Feedback? Email Aman at{" "}
                            <a
                                href="mailto:amansoni93744@email.com"
                                className="text-indigo-600 hover:underline"
                            >
                                amansoni93744@email.com
                            </a>
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
