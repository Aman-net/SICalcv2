import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import en from "./locales/en.json"
import hi from "./locales/hi.json"

export type Lang = "en" | "hi"

const translations: Record<Lang, Record<string, string>> = { en, hi }

interface I18nContextValue {
    lang: Lang
    setLanguage: (lang: Lang) => void
    t: (key: string) => string
    months: string[]
    dateLocale: string
}

const STORAGE_KEY = "si-lang"

function getInitialLang(): Lang {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored === "hi" || stored === "en") return stored
    } catch { /* ignore */ }
    return "en"
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Lang>(getInitialLang)

    const setLanguage = useCallback((newLang: Lang) => {
        setLangState(newLang)
        try {
            localStorage.setItem(STORAGE_KEY, newLang)
        } catch { /* ignore */ }
        document.documentElement.lang = newLang === "hi" ? "hi" : "en"
    }, [])

    const t = useCallback(
        (key: string): string => {
            const dict = translations[lang]
            return dict[key] ?? translations.en[key] ?? key
        },
        [lang],
    )

    const months = lang === "hi"
        ? ["जन", "फर", "मार", "अप्र", "मई", "जून", "जुल", "अग", "सित", "अक्ट", "नव", "दिस"]
        : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    const dateLocale = lang === "hi" ? "hi-IN" : "en-GB"

    return (
        <I18nContext.Provider value={{ lang, setLanguage, t, months, dateLocale }}>
            {children}
        </I18nContext.Provider>
    )
}

export function useTranslation() {
    const ctx = useContext(I18nContext)
    if (!ctx) throw new Error("useTranslation must be used within LanguageProvider")
    return ctx
}
