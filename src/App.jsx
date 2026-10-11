import { useEffect, useMemo, useRef, useState } from 'react'

import './App.css'

import SectionHeading from './components/SectionHeading'



import { money, dayLabel } from './utils/formatters'


const STORAGE_KEY = 'pulse-finance-v1'

const initialExpenses = []

const initialBills = [

   { id: 101, name: 'Mobile recharge', amount: 299, day: 8, paid: false },

   { id: 102, name: 'OTT subscription', amount: 149, day: 12, paid: false },

   { id: 103, name: 'Gym membership', amount: 499, day: 18, paid: false },

]

const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Subscriptions', 'Other']
const DEFAULT_SAVINGS = 1500
const DEFAULT_GOAL = 3000
const DEFAULT_DAY = 1
const DEMO_BUDGET = 10000

const categoryColors = ['#c5ff63', '#65d9ca', '#9e8bff', '#ff9e70', '#72b8ff', '#a7adb8']

const accentPalettes = [

   { id: 'lime', name: 'Lime', hex: '#c5ff63' },

   { id: 'blue', name: 'Ocean blue', hex: '#66c8ff' },

   { id: 'purple', name: 'Purple', hex: '#b7a0ff' },

   { id: 'pink', name: 'Pink', hex: '#ff8fb8' },

   { id: 'orange', name: 'Orange', hex: '#ffb86b' },

   { id: 'teal', name: 'Teal', hex: '#5be0c1' },

]

function readAccent() {

   try {

      const saved = localStorage.getItem('pulse-accent')

      return accentPalettes.some(palette => palette.id === saved) ? saved : 'lime'

   } catch {

      return 'lime'

   }

}


function clampNumber(value, fallback, min, max) {
   const number = Number(value)
   if (!Number.isFinite(number)) return fallback
   return Math.min(max, Math.max(min, number))
}

function createDefaultData() {
   return {
      expenses: [...initialExpenses],
      bills: initialBills.map(bill => ({ ...bill })),
      savings: DEFAULT_SAVINGS,
      goal: DEFAULT_GOAL,
      day: DEFAULT_DAY,
   }
}

/** Sanitize browser data before it reaches the UI. Local storage can be stale,
 * manually edited, partially written, or left behind by an older app version. */
function normalizeSavedData(value) {
   if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return createDefaultData()
   }

   const expenses = Array.isArray(value.expenses)
      ? value.expenses.flatMap((expense, index) => {
         if (!expense || typeof expense !== 'object') return []
         const name = String(expense.name ?? '').trim().slice(0, 70)
         const amount = Number(expense.amount)
         if (!name || !Number.isFinite(amount) || amount <= 0) return []
         const category = categories.includes(expense.category) ? expense.category : 'Other'
         return [{
            id: expense.id ?? `saved-expense-${index}`,
            name,
            amount,
            category,
            day: Math.round(clampNumber(expense.day, DEFAULT_DAY, 1, 30)),
            icon: typeof expense.icon === 'string' ? expense.icon.slice(0, 8) : '💸',
         }]
      })
      : [...initialExpenses]

   const bills = Array.isArray(value.bills)
      ? value.bills.flatMap((bill, index) => {
         if (!bill || typeof bill !== 'object') return []
         const name = String(bill.name ?? '').trim().slice(0, 70)
         const amount = Number(bill.amount)
         if (!name || !Number.isFinite(amount) || amount <= 0) return []
         return [{
            id: bill.id ?? `saved-bill-${index}`,
            name,
            amount,
            day: Math.round(clampNumber(bill.day, 1, 1, 30)),
            paid: Boolean(bill.paid),
         }]
      })
      : initialBills.map(bill => ({ ...bill }))

   return {
      expenses,
      bills,
      savings: clampNumber(value.savings, DEFAULT_SAVINGS, 0, DEMO_BUDGET),
      goal: clampNumber(value.goal, DEFAULT_GOAL, 1, 1_000_000_000),
      day: Math.round(clampNumber(value.day, DEFAULT_DAY, 1, 30)),
   }
}

function readSavedData() {
   try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? normalizeSavedData(JSON.parse(raw)) : createDefaultData()
   } catch {
      return createDefaultData()
   }
}

function writeSavedData(data) {
   try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      return true
   } catch {
      return false
   }
}

function makeId(prefix = 'item') {
   if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}-${crypto.randomUUID()}`
   }
   return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function csvCell(value) {
   const text = String(value ?? '')
   // Prefix formula-like text so spreadsheet software won't execute user input.
   const safeText = /^[\s]*[=+-@]/.test(text) ? `'${text}` : text
   return `"${safeText.replace(/"/g, '""')}"`
}

function calculateCategoryBreakdown(expenses) {
   const totals = new Map(categories.map(category => [category, 0]))

   expenses.forEach(expense => {
      const category = categories.includes(expense.category) ? expense.category : 'Other'
      totals.set(category, (totals.get(category) || 0) + Number(expense.amount || 0))
   })

   return categories.map((name, index) => ({
      name,
      amount: totals.get(name) || 0,
      color: categoryColors[index],
   })).filter(item => item.amount > 0)
}

function buildForecastPoints({ bills, day, remaining, daily, count }) {
   const intervalCount = Math.max(1, count - 1)

   return Array.from({ length: count }, (_, index) => {
      const forecastDay = Math.min(30, day + Math.round(((30 - day) * index) / intervalCount))
      const upcomingBills = bills
         .filter(bill => !bill.paid && bill.day > day && bill.day <= forecastDay)
         .reduce((sum, bill) => sum + Number(bill.amount || 0), 0)
      const elapsedDays = Math.max(0, forecastDay - day)

      return {
         label: forecastDay,
         value: Math.max(0, remaining - upcomingBills - elapsedDays * daily),
      }
   })
}

export default function App() {

   const [initialData] = useState(() => readSavedData())
   const toastTimerRef = useRef(null)
   const [page, setPage] = useState('Overview')

   const [mobileMenuOpen, setMobileMenuOpen] = useState(false)


   const [theme, setTheme] = useState(() => {

      try {

         return localStorage.getItem('pulse-theme') === 'light' ? 'light' : 'dark'

      } catch {

         return 'dark'

      }

   })

   const [accent, setAccent] = useState(readAccent)

   const [showPalette, setShowPalette] = useState(false)

   const budget = DEMO_BUDGET

   const [expenses, setExpenses] = useState(() => initialData.expenses)

   const [bills, setBills] = useState(() => initialData.bills)

   const [savings, setSavings] = useState(() => initialData.savings)

   const [goal, setGoal] = useState(() => initialData.goal)

   const [day, setDay] = useState(() => initialData.day)

   const [showAdd, setShowAdd] = useState(false)

   const [showSim, setShowSim] = useState(false)

   const [toast, setToast] = useState('')

   const [form, setForm] = useState({ name: '', amount: '', category: 'Food' })

   const [sim, setSim] = useState({ name: 'New headphones', amount: 2000, category: 'Shopping' })

   const [filter, setFilter] = useState('All')
   const [searchTerm, setSearchTerm] = useState('')

   const [saved, setSaved] = useState(false)


   const spent = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)

   const unpaidBills = bills.filter(bill => !bill.paid).reduce((sum, bill) => sum + bill.amount, 0)

   const remaining = budget - spent

   const available = remaining - unpaidBills - savings
   const remainingDays = Math.max(1, 30 - day + 1)
   // The current day counts as one of the remaining days in the 30-day challenge.
   const daily = Math.max(0, available / remainingDays)
   const projected = remaining - unpaidBills
   const spentPercent = Math.min(100, Math.max(0, (spent / budget) * 100))
  const [monthLabel] = useState(() =>
  new Intl.DateTimeFormat('en-IN', { month: 'long' })
    .format(new Date())
    .toUpperCase()
)

   const breakdown = useMemo(() => calculateCategoryBreakdown(expenses), [expenses])

   const future = useMemo(
      () => buildForecastPoints({ bills, day, remaining, daily, count: Math.min(7, 31 - day) }),
      [bills, day, remaining, daily],
   )

   const forecastBars = useMemo(
      () => buildForecastPoints({ bills, day, remaining, daily, count: Math.min(10, 31 - day) }),
      [bills, day, remaining, daily],
   )

   const chartCoordinates = future.length === 1
      ? [0, 440].map(x => ({
         x,
         y: Math.max(15, 120 - (Math.min(budget, Math.max(0, future[0].value)) / budget) * 105),
      }))
      : future.map((point, index) => ({
         x: (440 * index) / (future.length - 1),
         y: Math.max(15, 120 - (Math.min(budget, Math.max(0, point.value)) / budget) * 105),
      }))
   const chartLinePath = chartCoordinates
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
      .join(' ')
   const chartAreaPath = chartLinePath ? `${chartLinePath} L 440 140 L 0 140 Z` : ''

   const filteredExpenses = useMemo(() => {
      const query = searchTerm.trim().toLocaleLowerCase()
      return expenses.filter(expense => {
         const matchesCategory = filter === 'All' || expense.category === filter
         const matchesSearch = !query || `${expense.name} ${expense.category} ${expense.day}`
            .toLocaleLowerCase().includes(query)
         return matchesCategory && matchesSearch
      })
   }, [expenses, filter, searchTerm])


   // Keep every change in browser storage so deletes/additions survive refresh.

  useEffect(() => {
  // The app remains usable for this session if browser storage is unavailable.
  writeSavedData({ expenses, bills, savings, goal, day })
}, [expenses, bills, savings, goal, day])


   // Remember the selected appearance without changing finance-demo data.

   useEffect(() => {

      document.documentElement.dataset.theme = theme

      try {

         localStorage.setItem('pulse-theme', theme)

      } catch {

         // Theme still works for this session if storage is unavailable.

      }

   }, [theme])


   // Keep the chosen accent color across refreshes, independent of finance data.

   useEffect(() => {

      document.documentElement.dataset.accent = accent

      try {

         localStorage.setItem('pulse-accent', accent)

      } catch {

         // Accent selection still works for this session if storage is unavailable.

      }

   }, [accent])


   function notify(message) {
      setToast(message)
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
      toastTimerRef.current = window.setTimeout(() => {
         setToast('')
         toastTimerRef.current = null
      }, 2600)
   }

   useEffect(() => () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
   }, [])

   useEffect(() => {
      function handleEscape(event) {
         if (event.key !== 'Escape') return
         setShowAdd(false)
         setShowSim(false)
         setShowPalette(false)
         setMobileMenuOpen(false)
      }
      window.addEventListener('keydown', handleEscape)
      return () => window.removeEventListener('keydown', handleEscape)
   }, [])

   useEffect(() => {
      if (!showAdd && !showSim) return undefined

      const previousOverflow = document.body.style.overflow
      const previousFocus = document.activeElement
      const dialog = document.querySelector('[role="dialog"]')
      document.body.style.overflow = 'hidden'

      const getFocusableElements = () => dialog
         ? Array.from(dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'))
         : []

      getFocusableElements()[0]?.focus()

      function trapTab(event) {
         if (event.key !== 'Tab') return
         const elements = getFocusableElements()
         if (!elements.length) {
            event.preventDefault()
            return
         }
         const first = elements[0]
         const last = elements[elements.length - 1]
         if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last.focus()
         } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first.focus()
         }
      }

      dialog?.addEventListener('keydown', trapTab)

      return () => {
         dialog?.removeEventListener('keydown', trapTab)
         document.body.style.overflow = previousOverflow
         if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
      }
   }, [showAdd, showSim])


   function persist() {

      const didSave = writeSavedData({ expenses, bills, savings, goal, day })
      setSaved(didSave)
      notify(didSave ? 'Progress saved on this device' : 'Could not save locally in this browser')

   }


   function commitExpense({ name, amount, category, icon, label }) {
      const cleanName = String(name ?? '').trim().slice(0, 70)
      const numericAmount = Number(amount)

      if (!cleanName || !Number.isFinite(numericAmount) || numericAmount <= 0) {
         notify('Enter a valid name and amount')
         return false
      }
      if (numericAmount > remaining) {
         notify(`This expense exceeds your remaining balance of ${money(Math.max(0, remaining))}`)
         return false
      }
      if (!categories.includes(category)) {
         notify('Choose a valid expense category')
         return false
      }

      setExpenses(current => [{
         id: makeId('expense'),
         name: cleanName,
         amount: numericAmount,
         category,
         day,
         icon,
      }, ...current])
      setSaved(false)
      notify(label)
      return true
   }

   function addExpense(event) {
      event.preventDefault()
      const committed = commitExpense({
         ...form,
         icon: '💸',
         label: 'Expense added and saved',
      })
      if (!committed) return
      setForm({ name: '', amount: '', category: 'Food' })
      setShowAdd(false)
   }

   function applySimulation(event) {
      event.preventDefault()
      const committed = commitExpense({
         ...sim,
         icon: '🛍️',
         label: 'Decision applied and saved',
      })
      if (committed) setShowSim(false)
   }

   function removeExpense(id) {
      setExpenses(current => current.filter(expense => expense.id !== id))
      setSaved(false)
      notify('Expense removed and saved')
   }

   function toggleBill(id) {
      setBills(current => current.map(bill => bill.id === id ? { ...bill, paid: !bill.paid } : bill))
      setSaved(false)
      notify('Commitment status updated')
   }

   function exportExpensesCsv() {
      if (!filteredExpenses.length) {
         notify('There are no matching transactions to export')
         return
      }
      const rows = [
         ['Name', 'Amount (INR)', 'Category', 'Challenge day'],
         ...filteredExpenses.map(expense => [
            expense.name,
            Number(expense.amount).toFixed(2),
            expense.category,
            expense.day,
         ]),
      ]
      const csv = `\uFEFF${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}`
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `pulse-transactions-day-${day}.csv`
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      notify(`${filteredExpenses.length} transaction${filteredExpenses.length === 1 ? '' : 's'} exported`)
   }


   function resetDemo() {

      setExpenses([])

      setBills(initialBills.map(bill => ({ ...bill, paid: false })))

      setSavings(DEFAULT_SAVINGS)

      setGoal(DEFAULT_GOAL)

      setDay(DEFAULT_DAY)
      setShowAdd(false)
      setShowSim(false)
      setShowPalette(false)
      setMobileMenuOpen(false)

      setForm({ name: '', amount: '', category: 'Food' })

      setSim({ name: 'New headphones', amount: 2000, category: 'Shopping' })

      setFilter('All')
      setSearchTerm('')

      setSaved(false)

      writeSavedData({
         expenses: [],
         bills: initialBills.map(bill => ({ ...bill, paid: false })),
         savings: DEFAULT_SAVINGS,
         goal: DEFAULT_GOAL,
         day: DEFAULT_DAY,
      })

      notify('Demo reset: ₹10,000 budget, ₹0 spent, Day 01')

   }


   const nav = [['Overview', '◫'], ['Transactions', '↕'], ['Forecast', '⌁'], ['Savings', '◎'], ['Commitments', '▤']]


   return (

      <div className="app-shell">
         <a className="skip-link" href="#main-content">Skip to content</a>

         <aside className="sidebar">


<button

   type="button"

   className="mobile-menu-toggle"

   onClick={() => setMobileMenuOpen(open => !open)}

   aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}

   aria-expanded={mobileMenuOpen}

>

   {mobileMenuOpen ? '✕' : '☰'}

</button>


            <a className="brand" href="#home" onClick={event => { event.preventDefault(); setPage('Overview'); setMobileMenuOpen(false) }}>

               <span className="brand-mark">p.</span>

               <span>PULSE<small>MONEY, IN MOTION</small></span>

            </a>

            <div className="side-label">YOUR SPACE</div>


<nav className={`side-nav ${mobileMenuOpen ? 'is-open' : ''}`} aria-label="Main navigation">


               {nav.map(([name, icon]) => (

                  <button type="button" key={name} className={page === name ? 'nav-item active' : 'nav-item'} aria-current={page === name ? 'page' : undefined} onClick={() => { setPage(name); setMobileMenuOpen(false) }}>

                     <span className="nav-icon">{icon}</span>{name}

                     {name === 'Commitments' && <span className="nav-count">{bills.filter(bill => !bill.paid).length}</span>}

                  </button>

               ))}

            </nav>

            <div className="sidebar-bottom">

               <div className="streak-card">

                  <div className="streak-icon">✳</div>

                  <div><strong>Money mindful</strong><p>Every choice counts.</p></div>

                  <span className="tiny-dot" />

               </div>

               <button type="button" className="side-save" onClick={persist}>↥ Save my progress</button>

               <div className="profile">

                  <div className="avatar">U</div>

                  <div><strong>Money explorer</strong><small>30-day challenge</small></div>

                  <button type="button" title="Reset demo" aria-label="Reset demo data" onClick={resetDemo} className="reset-btn">↻</button>

               </div>

            </div>

         </aside>


         <main className="main-content" id="main-content" tabIndex={-1}>

            <header className="topbar">

               <div className="breadcrumb">Your money / <strong>{page}</strong></div>

               <div className="top-actions">

                  <span className="live-indicator"><i /> LIVE SIMULATION</span>

                  <button type="button" className="icon-btn" onClick={() => notify('You’re all caught up!')} aria-label="Notifications">♧</button>

                  <div className="color-picker">

                     <button
                        type="button"
                        className="color-picker-trigger"

                        onClick={() => setShowPalette(current => !current)}

                        aria-label="Choose accent color"

                        aria-expanded={showPalette}

                        aria-haspopup="true"

                        title="Customize accent color"

                     >

                        <span className="color-preview" aria-hidden="true" />

                        <span>Colors</span>

                        <span className="picker-chevron" aria-hidden="true">⌄</span>

                     </button>

                     {showPalette && <div className="color-palette" role="group" aria-label="Accent color choices">

                        <span className="palette-title">CHOOSE YOUR COLOR</span>

                        <div className="color-swatches">

                           {accentPalettes.map(palette => <button
                              type="button"
                              key={palette.id}

                              className={accent === palette.id ? 'color-swatch selected' : 'color-swatch'}

                              style={{ '--swatch-color': palette.hex }}

                              onClick={() => { setAccent(palette.id); setShowPalette(false); notify(`${palette.name} theme color applied`) }}

                              aria-label={`${palette.name} accent color`}

                              aria-pressed={accent === palette.id}

                              title={palette.name}

                           >{accent === palette.id ? '✓' : ''}</button>)}

                        </div>

                        <div className="palette-current">Selected: <strong>{accentPalettes.find(palette => palette.id === accent)?.name || 'Lime'}</strong></div>

                     </div>}

                  </div>

                  <button

                     type="button"

                     className="theme-toggle"

                     onClick={() => setTheme(current => current === 'dark' ? 'light' : 'dark')}

                     aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}

                     title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}

                  >

                     <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>

                     <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>

                  </button>

                  <div className="date-pill">◷ &nbsp; {monthLabel} · DAY {day}</div>

               </div>

            </header>


            <div className="page-wrap">

               <section className="welcome-row">

                  <div>

                     <div className="eyebrow"><span className="eyebrow-line" /> THE MONTH IS YOURS</div>

                     <h1>{page === 'Overview' ? <>Broke, but <span>in control.</span></> : page === 'Transactions' ? <>Follow the <span>money.</span></> : page === 'Forecast' ? <>Meet your <span>future.</span></> : page === 'Savings' ? <>Small moves. <span>Big goals.</span></> : <>Stay ahead of <span>the bills.</span></>}</h1>

                     <p className="welcome-copy">₹10,000. Thirty days. A hundred little decisions.<br />Let’s make every rupee count.</p>

                  </div>

                  <div className="day-control">

                     <span>SIMULATE TODAY</span>

                     <div className="day-control-row">

                        <button type="button" aria-label="Previous day" onClick={() => setDay(current => Math.max(1, current - 1))} disabled={day <= 1}>−</button>

                        <strong>DAY {String(day).padStart(2, '0')}<small> / 30</small></strong>

                        <button type="button" aria-label="Next day" onClick={() => setDay(current => Math.min(30, current + 1))} disabled={day >= 30}>+</button>

                     </div>

                     <div className="day-progress" role="progressbar" aria-label="Challenge progress" aria-valuemin={1} aria-valuemax={30} aria-valuenow={day}><i style={{ width: `${(day / 30) * 100}%` }} /></div>

                  </div>

               </section>


               {page === 'Overview' && <>

                  <section className="balance-grid">

                     <div className="balance-card">

                        <div className="card-top"><span>AVAILABLE BALANCE <i className="info-dot">i</i></span><span className="card-menu">↗</span></div>

                        <div className="balance-number">{money(remaining)}</div>

                        <div className="balance-foot"><span className="positive">↗ {Math.round(100 - spentPercent)}% left</span><span>of your {money(budget)} budget</span></div>

                        <div className="budget-track" role="progressbar" aria-label="Budget spent" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(spentPercent)}><i style={{ width: `${spentPercent}%` }} /></div>

                        <div className="balance-bottom"><span>Spent {money(spent)}</span><span>Budget {money(budget)}</span></div>

                        <div className="balance-orb orb-one" /><div className="balance-orb orb-two" />

                     </div>

                     <div className="metric-card lime-card">

                        <div className="card-top"><span>SAFE TO SPEND / DAY</span><span className="metric-symbol">↗</span></div>

                        <div className="metric-number">{money(daily)}</div><p>After bills &amp; savings</p>

                        <div className="metric-bottom"><span>↘ Keep it under control</span></div>

                     </div>

                     <div className="metric-card">

                        <div className="card-top"><span>SAVINGS GOAL</span><span className="metric-symbol">◎</span></div>

                        <div className="metric-number">{money(savings)}<small> / {money(goal)}</small></div>

                        <div className="goal-track" role="progressbar" aria-label="Savings goal progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(100, savings / Math.max(1, goal) * 100))}><i style={{ width: `${Math.min(100, savings / Math.max(1, goal) * 100)}%` }} /></div>

                        <p>{Math.round(Math.min(100, savings / Math.max(1, goal) * 100))}% of your target</p>

                     </div>

                  </section>

                  {available < 0 && <div className="budget-alert" role="status"><strong>{remaining < 0 ? 'Budget exceeded' : 'Spending plan needs attention'}</strong><span>{remaining < 0 ? `You are ${money(Math.abs(remaining))} over the starting budget.` : `Bills and savings exceed your available balance by ${money(Math.abs(available))}. Pause optional spending and review your plan.`}</span></div>}

<SectionHeading

   index="01"

   title="The money map"

   description="See where your ₹10K is going."

   actionLabel="All transactions ↗"

   onAction={() => setPage('Transactions')}

/>


                  <section className="analytics-grid">

                     <div className="panel spending-panel">

                        <div className="panel-head"><div><h3>Spending breakdown</h3><p>Your money has a pattern.</p></div><span className="mini-tag">THIS MONTH</span></div>

                        <div className="breakdown-layout">

                           <div className="donut-wrap">

                              <div className="donut" style={{ background: `conic-gradient(${breakdown.map((item, index) => {

                                 const before = breakdown.slice(0, index).reduce((sum, part) => sum + part.amount, 0)

                                 return `${item.color} ${before / Math.max(1, spent) * 100}% ${(before + item.amount) / Math.max(1, spent) * 100}%`

                              }).join(', ') || '#262d31 0% 100%'})` }}>

                                 <div><strong>{money(spent)}</strong><small>TOTAL SPENT</small></div>

                              </div>

                           </div>

                           <div className="legend">

                              {breakdown.map(item => <div className="legend-row" key={item.name}><span className="legend-dot" style={{ background: item.color }} /><span>{item.name}</span><strong>{money(item.amount)}</strong></div>)}

                              {!breakdown.length && <p>No expenses yet.</p>}

                           </div>

                        </div>

                     </div>

                     <div className="panel forecast-panel">

                        <div className="panel-head"><div><h3>Balance trajectory</h3><p>Your projected money runway.</p></div><span className="forecast-chip">↗ FORECAST</span></div>

                        <div className="forecast-big">{money(projected)}<span> projected after bills</span></div>

                        <div className="chart">

                           <div className="chart-labels"><span>₹10K</span><span>₹5K</span><span>₹0</span></div>

                           <svg viewBox="0 0 440 140" preserveAspectRatio="none" role="img" aria-label="Projected balance chart">

                              <defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity=".24" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>

                              {[15, 65, 115].map(y => <line key={y} x1="0" x2="440" y1={y} y2={y} stroke="var(--chart-grid, #293135)" strokeDasharray="4 5" />)}

                              <path d={chartAreaPath} fill="url(#chartFill)" />

                              <path d={chartLinePath} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />

                           </svg>

                        </div>

                        <div className="chart-footer"><span>DAY {future[0]?.label ?? day}</span><span>DAY {future[2]?.label ?? day}</span><span>DAY {future[4]?.label ?? day}</span><span>DAY {future[6]?.label ?? 30}</span></div>

                     </div>

                  </section>

                  <section className="decision-banner">

                     <div className="decision-symbol">↗</div>

                     <div className="decision-copy"><span className="eyebrow">BEFORE YOU BUY</span><h3>What will this cost your future self?</h3><p>Test a purchase first. See the ripple effect before spending a rupee.</p></div>

                     <button type="button" className="primary-btn" onClick={() => setShowSim(true)}>Simulate a decision <span>↗</span></button>

                  </section>


<SectionHeading

   index="02"

   title="Recent moves"

   description="Every rupee leaves a footprint."

   actionLabel="＋ Add expense"

   onAction={() => setShowAdd(true)}

   className="compact-heading"

/>


                  <section className="panel transactions-panel">

                     {expenses.slice(0, 4).map(expense => <div className="transaction-row" key={expense.id}><div className="transaction-icon">{expense.icon || '💸'}</div><div className="transaction-info"><strong>{expense.name}</strong><small>{expense.category} · {dayLabel(expense.day)}</small></div><span className="transaction-amount">−{money(expense.amount)}</span><button type="button" className="remove-btn" aria-label={`Remove ${expense.name}`} onClick={() => removeExpense(expense.id)}>Remove</button></div>)}

                     {!expenses.length && <div className="empty-state">Your next money move starts here.</div>}

                  </section>

               </>}


               {page === 'Transactions' && <section className="page-panel panel">

                  <div className="panel-head"><div><h3>Every rupee, accounted for.</h3><p>Record expenses and see the impact instantly.</p></div><button type="button" className="primary-btn small" onClick={() => setShowAdd(true)}>＋ Add expense</button></div>

                  <div className="transaction-toolbar">
                     <label className="transaction-search-label">
                        <span>Search transactions</span>
                        <input className="transaction-search" type="search" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Search name, category, or day..." aria-label="Search transactions by name, category, or day" />
                     </label>
                     <button type="button" className="primary-btn small export-btn" onClick={exportExpensesCsv} disabled={!filteredExpenses.length}>Export CSV ↗</button>
                  </div>

                  <div className="filter-row">{['All', ...categories].map(category => <button type="button" key={category} aria-pressed={filter === category} className={filter === category ? 'filter active-filter' : 'filter'} onClick={() => setFilter(category)}>{category}</button>)}</div>

                  {filteredExpenses.map(expense => <div className="transaction-row" key={expense.id}><div className="transaction-icon">{expense.icon || '💸'}</div><div className="transaction-info"><strong>{expense.name}</strong><small>{expense.category} · {dayLabel(expense.day)}</small></div><span className="transaction-amount">−{money(expense.amount)}</span><button type="button" className="remove-btn" aria-label={`Remove ${expense.name}`} onClick={() => removeExpense(expense.id)}>Remove</button></div>)}

                  {!filteredExpenses.length && <div className="empty-state">{expenses.length ? 'No transactions match these filters. Try another category or search.' : 'Your next money move starts here.'}</div>}

               </section>}


               {page === 'Forecast' && <section className="page-panel panel">

                  <div className="panel-head"><div><h3>30-day money forecast</h3><p>Estimate what remains after spending and unpaid commitments.</p></div><span className="forecast-chip">DEMO ESTIMATE</span></div>

                  <div className="forecast-big">{money(projected)}<span> projected after known bills</span></div>

                  <div className="large-chart" role="img" aria-label="Projected remaining balance across the rest of the 30-day challenge">{forecastBars.map((point, index) => (
                     <div className="bar-column" key={`${point.label}-${index}`}>
                        <span>{money(point.value)}</span>
                        <i style={{ height: `${Math.max(3, Math.min(100, point.value / budget * 100))}%` }} />
                        <small>DAY {point.label}</small>
                     </div>
                  ))}</div>

                  <div className="insight-box"><span>✳</span><div><strong>Your money insight</strong><p>{daily < 100 ? 'Your daily allowance is getting tight. Review optional spending before making a big purchase.' : 'You have some breathing room. Keep upcoming commitments in mind before making bigger purchases.'}</p></div></div>

                  <p className="fine-print">Forecasts are estimates based on recorded expenses and unpaid commitments, not financial advice.</p>

               </section>}


               {page === 'Savings' && <section className="page-panel panel">

                  <div className="panel-head"><div><h3>Build your future fund.</h3><p>Give your money a reason to stay.</p></div><span className="mini-tag">YOUR GOALS</span></div>

                  <div className="savings-hero"><div className="savings-ring" style={{ '--progress': `${Math.min(100, savings / Math.max(1, goal) * 100)}%` }}><div><strong>{Math.round(Math.min(100, savings / Math.max(1, goal) * 100))}%</strong><small>COMPLETE</small></div></div><div><span className="eyebrow">MAIN SAVINGS GOAL</span><h2>Future you fund</h2><p>{money(savings)} saved of {money(goal)}</p><strong className="savings-left">{money(Math.max(0, goal - savings))} to go</strong></div></div>

                  <div className="savings-controls"><label>Goal amount<input type="number" min="1" max="1000000000" step="1" inputMode="numeric" value={goal} onChange={event => setGoal(Math.max(1, Number(event.target.value)))} /></label><label>Current savings<input type="number" min="0" max={budget} step="1" inputMode="numeric" value={savings} onChange={event => setSavings(Math.min(budget, Math.max(0, Number(event.target.value))))} /></label></div>

                  <button type="button" className="primary-btn" onClick={persist}>Save goal progress ↗</button>

               </section>}


               {page === 'Commitments' && <section className="page-panel panel">

                  <div className="panel-head"><div><h3>The money you already owe.</h3><p>Upcoming bills are removed from your safe-to-spend estimate.</p></div><span className="mini-tag">{bills.filter(bill => !bill.paid).length} UPCOMING</span></div>

                  <div className="commitment-total"><span>UNPAID COMMITMENTS</span><strong>{money(unpaidBills)}</strong><p>Keep this amount aside before optional purchases.</p></div>

                  {bills.map(bill => <div className="bill-row" key={bill.id}><div className="bill-icon">{bill.paid ? '✓' : '↗'}</div><div className="transaction-info"><strong>{bill.name}</strong><small>Due on day {bill.day} · {bill.paid ? 'Marked paid' : 'Upcoming'}</small></div><strong className="bill-amount">{money(bill.amount)}</strong><button type="button" className={bill.paid ? 'paid-button' : 'mark-paid'} onClick={() => toggleBill(bill.id)}>{bill.paid ? 'Undo' : 'Mark paid'}</button></div>)}

                  <p className="fine-print">Demo commitments are sample data stored on this device.</p>

               </section>}


               <footer className="footer"><span>◉ PULSE FINANCE SIMULATOR</span><span>BUILT FOR BETTER MONEY MOVES · DEMO DATA</span><button type="button" onClick={resetDemo}>Reset demo ↻</button></footer>

            </div>

         </main>


         {showAdd && <div className="modal-backdrop" onClick={() => setShowAdd(false)}><form className="modal" role="dialog" aria-modal="true" aria-labelledby="add-expense-title" onSubmit={addExpense} onClick={event => event.stopPropagation()}><button type="button" className="modal-close" aria-label="Close add expense dialog" onClick={() => setShowAdd(false)}>×</button><span className="eyebrow">NEW MONEY MOVE</span><h2 id="add-expense-title">Add an expense</h2><p>Keep your timeline honest.</p><label>What did you spend on?<input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="e.g. Lunch with friends" maxLength="70" /></label><label>Amount (₹)<input type="number" min="1" step="1" inputMode="numeric" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} placeholder="450" /></label><label>Category<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}>{categories.map(category => <option key={category}>{category}</option>)}</select></label><button className="primary-btn full-btn" type="submit">Add to timeline ↗</button></form></div>}


         {showSim && <div className="modal-backdrop" onClick={() => setShowSim(false)}><form className="modal simulation-modal" role="dialog" aria-modal="true" aria-labelledby="simulation-title" onSubmit={applySimulation} onClick={event => event.stopPropagation()}><button type="button" className="modal-close" aria-label="Close purchase simulator" onClick={() => setShowSim(false)}>×</button><span className="eyebrow">THE FUTURE SELF SIMULATOR</span><h2 id="simulation-title">Can you afford the feeling?</h2><p>Preview a purchase before it becomes a transaction.</p><label>What are you thinking of buying?<input value={sim.name} maxLength="70" onChange={event => setSim({ ...sim, name: event.target.value })} /></label><label>Price (₹)<input type="number" min="1" step="1" inputMode="numeric" value={sim.amount} onChange={event => setSim({ ...sim, amount: event.target.value })} /></label><label>Category<select value={sim.category} onChange={event => setSim({ ...sim, category: event.target.value })}>{categories.map(category => <option key={category}>{category}</option>)}</select></label><div className="simulation-result"><div><span>Balance after purchase</span><strong>{money(remaining - Math.max(0, Number(sim.amount) || 0))}</strong></div><div><span>New daily allowance</span><strong>{money(Math.max(0, (remaining - Math.max(0, Number(sim.amount) || 0) - unpaidBills - savings) / Math.max(1, 31 - day + 1)))}</strong></div><p>{Number(sim.amount) > remaining * 0.3 ? '⚠ This is a big move. Think about your upcoming commitments.' : '✳ Check the forecast, then decide what feels right.'}</p></div><button className="primary-btn full-btn" type="submit">Commit this decision ↗</button></form></div>}


         {toast && <div className="toast" role="status" aria-live="polite"><span aria-hidden="true">✓</span>{toast}</div>}

         {saved && <span className="sr-only" role="status">Progress saved</span>}

      </div>

   )

}
