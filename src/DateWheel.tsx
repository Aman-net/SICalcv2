import { forwardRef, useEffect, useMemo, useRef, useState } from "react"

type DateParts = { year: number; month: number; day: number }

type Props = {
    value: string
    onChange: (isoDate: string) => void
    className?: string
}

const MONTH_NAMES = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
]
const ITEM_HEIGHT = 40

function pad(value: number) {
    return String(value).padStart(2, "0")
}

function formatISO({ year, month, day }: DateParts) {
    return `${year}-${pad(month)}-${pad(day)}`
}

function parseISO(value: string): DateParts {
    const [year = "0", month = "01", day = "01"] = value.split("-")
    return {
        year: Number(year) || new Date().getFullYear(),
        month: Number(month) || 1,
        day: Number(day) || 1,
    }
}

function datesEqual(a: DateParts, b: DateParts) {
    return a.year === b.year && a.month === b.month && a.day === b.day
}

function daysInMonth(year: number, month: number) {
    return new Date(year, month, 0).getDate()
}

function todayISO() {
    const now = new Date()
    return formatISO({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
    })
}

export default forwardRef<HTMLDivElement, Props>(function DateWheel(
    { value, onChange, className },
    ref,
) {
    const parsed = useMemo(
        () => (value ? parseISO(value) : parseISO(todayISO())),
        [value],
    )
    const [selected, setSelected] = useState<DateParts>(parsed)
    const hasTouchedRef = useRef(false)
    const interactionRef = useRef(false)
    const scrollTick = useRef<number | null>(null)
    const dayRef = useRef<HTMLDivElement>(null)
    const monthRef = useRef<HTMLDivElement>(null)
    const yearRef = useRef<HTMLDivElement>(null)
    const scrollTimeout = useRef<number | null>(null)

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear()
        const centered = Math.max(currentYear, parsed.year)
        const start = Math.max(1900, centered - 40)
        const end = centered + 30
        return Array.from(
            { length: end - start + 1 },
            (_, index) => start + index,
        )
    }, [parsed.year])

    const dayCount = useMemo(
        () => daysInMonth(selected.year, selected.month),
        [selected.year, selected.month],
    )

    useEffect(() => {
        if (value) {
            setSelected(parseISO(value))
            hasTouchedRef.current = true
        } else {
            setSelected(parsed)
        }
    }, [value, parsed])

    useEffect(() => {
        if (selected.day > dayCount) {
            setSelected((prev) => ({ ...prev, day: dayCount }))
        }
    }, [dayCount, selected.day])

    useEffect(() => {
        if (interactionRef.current) return
        const timeout = window.setTimeout(() => {
            if (dayRef.current)
                dayRef.current.scrollTop = (selected.day - 1) * ITEM_HEIGHT
            if (monthRef.current)
                monthRef.current.scrollTop = (selected.month - 1) * ITEM_HEIGHT
            if (yearRef.current) {
                const yearIndex = years.indexOf(selected.year)
                if (yearIndex >= 0)
                    yearRef.current.scrollTop = yearIndex * ITEM_HEIGHT
            }
        }, 0)
        return () => window.clearTimeout(timeout)
    }, [selected, years])

    function commitDate(next: DateParts) {
        setSelected(next)
        if (!hasTouchedRef.current || formatISO(next) !== value) {
            hasTouchedRef.current = true
            onChange(formatISO(next))
        }
    }

    function getDateFromScroll(type: "day" | "month" | "year") {
        const source =
            type === "day"
                ? dayRef.current
                : type === "month"
                  ? monthRef.current
                  : yearRef.current
        if (!source) return selected

        const index = Math.round(source.scrollTop / ITEM_HEIGHT)
        if (type === "day") {
            return {
                ...selected,
                day: Math.min(Math.max(1, index + 1), dayCount),
            }
        }
        if (type === "month") {
            const nextMonth = Math.min(Math.max(1, index + 1), 12)
            const maxDay = daysInMonth(selected.year, nextMonth)
            return {
                ...selected,
                month: nextMonth,
                day: Math.min(selected.day, maxDay),
            }
        }
        const yearIndex = Math.min(Math.max(0, index), years.length - 1)
        const nextYear = years[yearIndex]
        const maxDay = daysInMonth(nextYear, selected.month)
        return {
            ...selected,
            year: nextYear,
            day: Math.min(selected.day, maxDay),
        }
    }

    function handleScroll(type: "day" | "month" | "year") {
        interactionRef.current = true
        if (scrollTick.current) cancelAnimationFrame(scrollTick.current)
        scrollTick.current = requestAnimationFrame(() => {
            const next = getDateFromScroll(type)
            if (!datesEqual(next, selected)) setSelected(next)
        })
        if (scrollTimeout.current) window.clearTimeout(scrollTimeout.current)
        scrollTimeout.current = window.setTimeout(() => {
            interactionRef.current = false
            commitDate(getDateFromScroll(type))
        }, 30)
    }

    function handleScrollEnd(type: "day" | "month" | "year") {
        if (scrollTimeout.current) window.clearTimeout(scrollTimeout.current)
        if (scrollTick.current) cancelAnimationFrame(scrollTick.current)
        interactionRef.current = false
        commitDate(getDateFromScroll(type))
    }

    return (
        <div
            ref={ref}
            tabIndex={0}
            className={`relative ${className ?? ""}`}
            aria-label="Date wheel picker"
        >
            <div className="date-wheel relative flex gap-2 p-2">
                <div className="date-wheel__focus-ring" aria-hidden="true" />
                <div
                    ref={dayRef}
                    role="listbox"
                    aria-label="Day"
                    className="date-wheel__column rounded-2xl bg-slate-50 border border-slate-200"
                    onScroll={() => handleScroll("day")}
                    onPointerDown={() => {
                        interactionRef.current = true
                    }}
                    onPointerUp={() => handleScrollEnd("day")}
                    onTouchEnd={() => handleScrollEnd("day")}
                >
                    <div className="date-wheel__spacer" />
                    {Array.from({ length: dayCount }, (_, index) => {
                        const valueDay = index + 1
                        const selectedItem = valueDay === selected.day
                        return (
                            <div
                                key={valueDay}
                                className={`date-wheel__item ${selectedItem ? "date-wheel__item--selected" : "text-slate-500"}`}
                            >
                                {valueDay}
                            </div>
                        )
                    })}
                    <div className="date-wheel__spacer" />
                </div>

                <div
                    ref={monthRef}
                    role="listbox"
                    aria-label="Month"
                    className="date-wheel__column rounded-2xl bg-slate-50 border border-slate-200"
                    onScroll={() => handleScroll("month")}
                    onPointerDown={() => {
                        interactionRef.current = true
                    }}
                    onPointerUp={() => handleScrollEnd("month")}
                    onTouchEnd={() => handleScrollEnd("month")}
                >
                    <div className="date-wheel__spacer" />
                    {MONTH_NAMES.map((name, index) => {
                        const monthValue = index + 1
                        const selectedItem = monthValue === selected.month
                        return (
                            <div
                                key={name}
                                className={`date-wheel__item ${selectedItem ? "date-wheel__item--selected" : "text-slate-500"}`}
                            >
                                {name}
                            </div>
                        )
                    })}
                    <div className="date-wheel__spacer" />
                </div>

                <div
                    ref={yearRef}
                    role="listbox"
                    aria-label="Year"
                    className="date-wheel__column rounded-2xl bg-slate-50 border border-slate-200"
                    onScroll={() => handleScroll("year")}
                    onPointerDown={() => {
                        interactionRef.current = true
                    }}
                    onPointerUp={() => handleScrollEnd("year")}
                    onTouchEnd={() => handleScrollEnd("year")}
                >
                    <div className="date-wheel__spacer" />
                    {years.map((yearValue) => {
                        const selectedItem = yearValue === selected.year
                        return (
                            <div
                                key={yearValue}
                                className={`date-wheel__item ${selectedItem ? "date-wheel__item--selected" : "text-slate-500"}`}
                            >
                                {yearValue}
                            </div>
                        )
                    })}
                    <div className="date-wheel__spacer" />
                </div>
            </div>
            <div className="date-wheel__mask" aria-hidden="true" />
        </div>
    )
})
