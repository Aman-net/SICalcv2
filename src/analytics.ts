declare global {
    interface Window {
        dataLayer?: unknown[]
        gtag?: (...args: unknown[]) => void
    }
}

const MEASUREMENT_ID = "G-8ZBYPYG95C"

function getGtag() {
    return window.gtag
}

function loadGtagScript() {
    if (!MEASUREMENT_ID) return
    if (
        document.querySelector(
            `script[src*="googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}"]`,
        )
    ) {
        return
    }

    const script = document.createElement("script")
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`
    document.head.appendChild(script)
}

export function initAnalytics() {
    if (!MEASUREMENT_ID || typeof window === "undefined") return
    if (window.gtag) return

    window.dataLayer = window.dataLayer || []
    window.gtag = function gtag() {
        window.dataLayer!.push(arguments)
    }

    loadGtagScript()
    window.gtag("js", new Date())
    window.gtag("config", MEASUREMENT_ID, {
        send_page_view: false,
    })
}

export function sendPageView(path: string) {
    const gtag = getGtag()
    if (!gtag) return
    gtag("event", "page_view", {
        page_path: path,
    })
}

export function logEvent(name: string, params?: Record<string, unknown>) {
    const gtag = getGtag()
    if (!gtag) return
    gtag("event", name, params)
}

export function trackAppOpen() {
    logEvent("app_open")
}

export function trackInstallPrompt() {
    logEvent("pwa_install_prompt")
}

export function trackInstallAccepted() {
    logEvent("pwa_install_accepted")
}

export function trackAppInstalled() {
    logEvent("pwa_installed")
}
