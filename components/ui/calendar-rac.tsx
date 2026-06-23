"use client"

import { cn } from "@/lib/utils"
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date"
import { ComponentProps, useState, useEffect } from "react"
import {
  CalendarCell as CalendarCellRac,
  CalendarGridBody as CalendarGridBodyRac,
  CalendarGridHeader as CalendarGridHeaderRac,
  CalendarGrid as CalendarGridRac,
  CalendarHeaderCell as CalendarHeaderCellRac,
  Calendar as CalendarRac,
  RangeCalendar as RangeCalendarRac,
  Heading as HeadingRac,
  Button,
  composeRenderProps,
  type DateValue,
} from "react-aria-components"
import { ChevronLeft, ChevronRight } from "lucide-react"

type View = "days" | "months" | "years"

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const MONTH_FULL = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"]

// ── Drill-down header (replaces static HeadingRac + slot buttons) ──────────

interface DrillDownHeaderProps {
  view: View
  focusedDate: CalendarDate
  setView: (v: View) => void
  setFocusedDate: (d: CalendarDate) => void
}

const DrillDownHeader = ({ view, focusedDate, setView, setFocusedDate }: DrillDownHeaderProps) => {
  const decadeStart = Math.floor(focusedDate.year / 12) * 12

  const headingText =
    view === "days"   ? `${MONTH_FULL[focusedDate.month - 1]} ${focusedDate.year}`
    : view === "months" ? `${focusedDate.year}`
    : `${decadeStart} – ${decadeStart + 11}`

  const handlePrev = () => {
    if (view === "days")   setFocusedDate(focusedDate.subtract({ months: 1 }))
    else if (view === "months") setFocusedDate(focusedDate.subtract({ years: 1 }))
    else setFocusedDate(focusedDate.subtract({ years: 12 }))
  }

  const handleNext = () => {
    if (view === "days")   setFocusedDate(focusedDate.add({ months: 1 }))
    else if (view === "months") setFocusedDate(focusedDate.add({ years: 1 }))
    else setFocusedDate(focusedDate.add({ years: 12 }))
  }

  const handleHeadingClick = () => {
    if (view === "days")   setView("months")
    else if (view === "months") setView("years")
    // years has no further zoom
  }

  return (
    <header className="flex w-full items-center gap-1 pb-1">
      <button
        type="button"
        onClick={handlePrev}
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground/80 outline-offset-2 transition-colors hover:bg-accent hover:text-foreground focus:outline-none"
      >
        <ChevronLeft size={16} strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={view !== "years" ? handleHeadingClick : undefined}
        className={cn(
          "grow text-center text-sm font-medium rounded-lg py-1 transition-colors",
          view !== "years" && "hover:bg-accent cursor-pointer",
        )}
      >
        {headingText}
      </button>
      <button
        type="button"
        onClick={handleNext}
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground/80 outline-offset-2 transition-colors hover:bg-accent hover:text-foreground focus:outline-none"
      >
        <ChevronRight size={16} strokeWidth={2} />
      </button>
    </header>
  )
}

// ── Month picker grid ────────────────────────────────────────────────────────

interface MonthGridProps {
  focusedDate: CalendarDate
  selectedDate: DateValue | null | undefined
  setFocusedDate: (d: CalendarDate) => void
  setView: (v: View) => void
}

const MonthGrid = ({ focusedDate, selectedDate, setFocusedDate, setView }: MonthGridProps) => {
  const selMonth =
    selectedDate && typeof selectedDate === "object" && "month" in selectedDate &&
    (selectedDate as CalendarDate).year === focusedDate.year
      ? (selectedDate as CalendarDate).month
      : null

  return (
    <div className="grid grid-cols-3 gap-1 py-1" style={{ width: 252 }}>
      {MONTH_ABBR.map((abbr, i) => {
        const isSelected = selMonth === i + 1
        return (
          <button
            key={abbr}
            type="button"
            onClick={() => {
              setFocusedDate(focusedDate.set({ month: i + 1, day: 1 }))
              setView("days")
            }}
            className={cn(
              "rounded-lg py-2 text-sm font-normal transition-colors",
              isSelected
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {abbr}
          </button>
        )
      })}
    </div>
  )
}

// ── Year picker grid ─────────────────────────────────────────────────────────

interface YearGridProps {
  focusedDate: CalendarDate
  selectedDate: DateValue | null | undefined
  setFocusedDate: (d: CalendarDate) => void
  setView: (v: View) => void
}

const YearGrid = ({ focusedDate, selectedDate, setFocusedDate, setView }: YearGridProps) => {
  const decadeStart = Math.floor(focusedDate.year / 12) * 12
  const years = Array.from({ length: 12 }, (_, i) => decadeStart + i)

  const selYear =
    selectedDate && typeof selectedDate === "object" && "year" in selectedDate
      ? (selectedDate as CalendarDate).year
      : null

  return (
    <div className="grid grid-cols-3 gap-1 py-1" style={{ width: 252 }}>
      {years.map((year) => {
        const isSelected = selYear === year
        return (
          <button
            key={year}
            type="button"
            onClick={() => {
              setFocusedDate(focusedDate.set({ year }))
              setView("months")
            }}
            className={cn(
              "rounded-lg py-2 text-sm font-normal transition-colors",
              isSelected
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {year}
          </button>
        )
      })}
    </div>
  )
}

// ── Standard day grid (used in days view + range calendar) ───────────────────

const CalendarGridComponent = ({ isRange = false }: { isRange?: boolean }) => {
  const now = today(getLocalTimeZone())

  return (
    <CalendarGridRac>
      <CalendarGridHeaderRac>
        {(day) => (
          <CalendarHeaderCellRac className="size-9 rounded-lg p-0 text-xs font-medium text-muted-foreground/80">
            {day}
          </CalendarHeaderCellRac>
        )}
      </CalendarGridHeaderRac>
      <CalendarGridBodyRac className="[&_td]:px-0" style={{ minHeight: 216 }}>
        {(date) => (
          <CalendarCellRac
            date={date}
            className={cn(
              "relative flex size-9 items-center justify-center whitespace-nowrap rounded-lg border border-transparent p-0 text-sm font-normal text-foreground outline-offset-2 duration-150 [transition-property:color,background-color,border-radius,box-shadow] focus:outline-none data-[disabled]:pointer-events-none data-[unavailable]:pointer-events-none data-[focus-visible]:z-10 data-[hovered]:bg-accent data-[selected]:bg-primary data-[hovered]:text-foreground data-[selected]:text-primary-foreground data-[unavailable]:line-through data-[disabled]:opacity-30 data-[unavailable]:opacity-30 data-[focus-visible]:outline data-[focus-visible]:outline-2 data-[focus-visible]:outline-ring/70",
              isRange &&
                "data-[selected]:rounded-none data-[selection-end]:rounded-e-lg data-[selection-start]:rounded-s-lg data-[invalid]:bg-red-100 data-[selected]:bg-accent data-[selected]:text-foreground data-[invalid]:data-[selection-end]:[&:not([data-hover])]:bg-destructive data-[invalid]:data-[selection-start]:[&:not([data-hover])]:bg-destructive data-[selection-end]:[&:not([data-hover])]:bg-primary data-[selection-start]:[&:not([data-hover])]:bg-primary data-[invalid]:data-[selection-end]:[&:not([data-hover])]:text-destructive-foreground data-[invalid]:data-[selection-start]:[&:not([data-hover])]:text-destructive-foreground data-[selection-end]:[&:not([data-hover])]:text-primary-foreground data-[selection-start]:[&:not([data-hover])]:text-primary-foreground",
              date.compare(now) === 0 &&
                cn(
                  "after:pointer-events-none after:absolute after:bottom-1 after:start-1/2 after:z-10 after:size-[3px] after:-translate-x-1/2 after:rounded-full after:bg-primary",
                  isRange
                    ? "data-[selection-end]:[&:not([data-hover])]:after:bg-background data-[selection-start]:[&:not([data-hover])]:after:bg-background"
                    : "data-[selected]:after:bg-background",
                ),
            )}
          />
        )}
      </CalendarGridBodyRac>
    </CalendarGridRac>
  )
}

// ── Calendar (single selection with drill-down) ──────────────────────────────

interface BaseCalendarProps {
  className?: string
}

type CalendarProps = ComponentProps<typeof CalendarRac> & BaseCalendarProps

const Calendar = ({ className, value, onChange, ...props }: CalendarProps) => {
  const [view, setView] = useState<View>("days")

  const [focusedDate, setFocusedDate] = useState<CalendarDate>(() => {
    if (value && typeof value === "object" && "year" in value) return value as CalendarDate
    return today(getLocalTimeZone())
  })

  // Sync focused month when an external value is set (e.g. user types in the text input)
  useEffect(() => {
    if (value && typeof value === "object" && "year" in value) {
      setFocusedDate(value as CalendarDate)
    }
  }, [value])

  return (
    <CalendarRac
      {...props}
      value={value}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onChange={onChange as any}
      focusedValue={focusedDate}
      onFocusChange={(d) => setFocusedDate(d as CalendarDate)}
      className={composeRenderProps(className, (className) => cn("w-fit", className))}
    >
      <DrillDownHeader
        view={view}
        focusedDate={focusedDate}
        setView={setView}
        setFocusedDate={setFocusedDate}
      />

      <div style={{ minHeight: 252 }}>
        {view === "days" && <CalendarGridComponent />}

        {view === "months" && (
          <MonthGrid
            focusedDate={focusedDate}
            selectedDate={value as DateValue | null}
            setFocusedDate={setFocusedDate}
            setView={setView}
          />
        )}

        {view === "years" && (
          <YearGrid
            focusedDate={focusedDate}
            selectedDate={value as DateValue | null}
            setFocusedDate={setFocusedDate}
            setView={setView}
          />
        )}
      </div>
    </CalendarRac>
  )
}

// ── Range calendar (no drill-down needed) ────────────────────────────────────

type RangeCalendarProps = ComponentProps<typeof RangeCalendarRac> & BaseCalendarProps

const RangeCalendar = ({ className, ...props }: RangeCalendarProps) => {
  return (
    <RangeCalendarRac
      {...props}
      className={composeRenderProps(className, (className) => cn("w-fit", className))}
    >
      <header className="flex w-full items-center gap-1 pb-1">
        <Button
          slot="previous"
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground/80 outline-offset-2 transition-colors hover:bg-accent hover:text-foreground focus:outline-none data-[focus-visible]:outline data-[focus-visible]:outline-2 data-[focus-visible]:outline-ring/70"
        >
          <ChevronLeft size={16} strokeWidth={2} />
        </Button>
        <HeadingRac className="grow text-center text-sm font-medium" />
        <Button
          slot="next"
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground/80 outline-offset-2 transition-colors hover:bg-accent hover:text-foreground focus:outline-none data-[focus-visible]:outline data-[focus-visible]:outline-2 data-[focus-visible]:outline-ring/70"
        >
          <ChevronRight size={16} strokeWidth={2} />
        </Button>
      </header>
      <CalendarGridComponent isRange />
    </RangeCalendarRac>
  )
}

export { Calendar, RangeCalendar }
