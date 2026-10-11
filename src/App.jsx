import { useEffect, useMemo, useState } from 'react'
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


function readSavedData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function App() {
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
  const [budget] = useState(10000)
  const [expenses, setExpenses] = useState(() => readSavedData()?.expenses ?? initialExpenses)
  const [bills, setBills] = useState(() => readSavedData()?.bills ?? initialBills)
  const [savings, setSavings] = useState(() => readSavedData()?.savings ?? 1500)
  const [goal, setGoal] = useState(() => readSavedData()?.goal ?? 3000)
  const [day, setDay] = useState(() => readSavedData()?.day ?? 1)
  const [showAdd, setShowAdd] = useState(false)
  const [showSim, setShowSim] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ name: '', amount: '', category: 'Food' })
  const [sim, setSim] = useState({ name: 'New headphones', amount: 2000, category: 'Shopping' })
  const [filter, setFilter] = useState('All')
  const [saved, setSaved] = useState(false)

  const spent = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
  const unpaidBills = bills.filter(bill => !bill.paid).reduce((sum, bill) => sum + bill.amount, 0)
  const remaining = budget - spent
  const available = remaining - unpaidBills - savings
  const daily = Math.max(0, available / Math.max(1, 31 - day + 1))
  const projected = remaining - unpaidBills
  const spentPercent = Math.min(100, (spent / budget) * 100)
  const breakdown = useMemo(() => categories.map((name, index) => ({
    name,
    amount: expenses.filter(expense => expense.category === name)
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    color: categoryColors[index],
  })).filter(item => item.amount > 0), [expenses])

  const future = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const futureDay = Math.min(30, day + index * 4)
    const due = bills.filter(bill => !bill.paid && bill.day > day && bill.day <= futureDay)
      .reduce((sum, bill) => sum + bill.amount, 0)
    return { label: futureDay, value: Math.max(0, remaining - due - index * daily * 4) }
  }), [bills, day, remaining, daily])

  // Keep every change in browser storage so deletes/additions survive refresh.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ expenses, bills, savings, goal, day }))
    } catch {
      // The app still works for this session if browser storage is unavailable.
    }
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
    window.setTimeout(() => setToast(''), 2600)
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ expenses, bills, savings, goal, day }))
      setSaved(true)
      notify('Progress saved on this device')
    } catch {
      notify('Could not save locally in this browser')
    }
  }

  function addExpense(event) {
    event.preventDefault()
    const amount = Number(form.amount)
    if (!form.name.trim() || !Number.isFinite(amount) || amount <= 0) {
      notify('Enter a valid name and amount')
      return
    }
    if (amount > remaining) {
      notify('That expense exceeds your remaining budget')
      return
    }
    setExpenses(current => [
      { id: Date.now(), name: form.name.trim(), amount, category: form.category, day, icon: '💸' },
      ...current,
    ])
    setForm({ name: '', amount: '', category: 'Food' })
    setShowAdd(false)
    notify('Expense added and saved')
  }

  function applySimulation(event) {
    event.preventDefault()
    const amount = Number(sim.amount)
    if (!sim.name.trim() || !Number.isFinite(amount) || amount <= 0) {
      notify('Enter a valid purchase and amount')
      return
    }
    if (amount > remaining) {
      notify('This purchase exceeds your remaining balance')
      return
    }
    setExpenses(current => [
      { id: Date.now(), name: sim.name.trim(), amount, category: sim.category, day, icon: '🛍️' },
      ...current,
    ])
    setShowSim(false)
    notify('Decision applied and saved')
  }

  function toggleBill(id) {
    setBills(current => current.map(bill => bill.id === id ? { ...bill, paid: !bill.paid } : bill))
    notify('Commitment status updated')
  }

  function resetDemo() {
    setExpenses([])
    setBills(initialBills.map(bill => ({ ...bill, paid: false })))
    setSavings(1500)
    setGoal(3000)
    setDay(1)
    setForm({ name: '', amount: '', category: 'Food' })
    setSim({ name: 'New headphones', amount: 2000, category: 'Shopping' })
    setFilter('All')
    setSaved(false)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        expenses: [], bills: initialBills.map(bill => ({ ...bill, paid: false })),
        savings: 1500, goal: 3000, day: 1,
      }))
    } catch {}
    notify('Demo reset: ₹10,000 budget, ₹0 spent, Day 01')
  }

  const nav = [['Overview', '◫'], ['Transactions', '↕'], ['Forecast', '⌁'], ['Savings', '◎'], ['Commitments', '▤']]

  return (
    <div className="app-shell">
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

        <a className="brand" href="#home" onClick={event => { event.preventDefault(); setPage('Overview') }}>
          <span className="brand-mark">p.</span>
          <span>PULSE<small>MONEY, IN MOTION</small></span>
        </a>
        <div className="side-label">YOUR SPACE</div>
        
<nav className={`side-nav ${mobileMenuOpen ? 'is-open' : ''}`}>

          {nav.map(([name, icon]) => (
            <button key={name} className={page === name ? 'nav-item active' : 'nav-item'} onClick={() => setPage(name)}>
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
          <button className="side-save" onClick={persist}>↥ Save my progress</button>
          <div className="profile">
            <div className="avatar">U</div>
            <div><strong>Money explorer</strong><small>30-day challenge</small></div>
            <button title="Reset demo" onClick={resetDemo} className="reset-btn">↻</button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">Your money / <strong>{page}</strong></div>
          <div className="top-actions">
            <span className="live-indicator"><i /> LIVE SIMULATION</span>
            <button className="icon-btn" onClick={() => notify('You’re all caught up!')} aria-label="Notifications">♧</button>
            <div className="color-picker">
              <button
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
              className="theme-toggle"
              onClick={() => setTheme(current => current === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
            <div className="date-pill">◷ &nbsp; OCTOBER · DAY {day}</div>
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
                <button onClick={() => setDay(current => Math.max(1, current - 1))} disabled={day <= 1}>−</button>
                <strong>DAY {String(day).padStart(2, '0')}<small> / 30</small></strong>
                <button onClick={() => setDay(current => Math.min(30, current + 1))} disabled={day >= 30}>+</button>
              </div>
              <div className="day-progress"><i style={{ width: `${(day / 30) * 100}%` }} /></div>
            </div>
          </section>

          {page === 'Overview' && <>
            <section className="balance-grid">
              <div className="balance-card">
                <div className="card-top"><span>AVAILABLE BALANCE <i className="info-dot">i</i></span><span className="card-menu">↗</span></div>
                <div className="balance-number">{money(remaining)}</div>
                <div className="balance-foot"><span className="positive">↗ {Math.round(100 - spentPercent)}% left</span><span>of your {money(budget)} budget</span></div>
                <div className="budget-track"><i style={{ width: `${spentPercent}%` }} /></div>
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
                <div className="goal-track"><i style={{ width: `${Math.min(100, savings / Math.max(1, goal) * 100)}%` }} /></div>
                <p>{Math.round(Math.min(100, savings / Math.max(1, goal) * 100))}% of your target</p>
              </div>
            </section>
            
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
                    {[15, 65, 115].map(y => <line key={y} x1="0" x2="440" y1={y} y2={y} stroke="#293135" strokeDasharray="4 5" />)}
                    <path d={`M 0 20 ${future.map((point, index) => `L ${index * 73.3} ${Math.max(15, 120 - (point.value / budget) * 105)}`).join(' ')} L 440 140 L 0 140 Z`} fill="url(#chartFill)" />
                    <path d={`M 0 20 ${future.map((point, index) => `L ${index * 73.3} ${Math.max(15, 120 - (point.value / budget) * 105)}`).join(' ')}`} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="chart-footer"><span>NOW</span><span>DAY {Math.min(30, day + 4)}</span><span>DAY {Math.min(30, day + 12)}</span><span>DAY 30</span></div>
              </div>
            </section>
            <section className="decision-banner">
              <div className="decision-symbol">↗</div>
              <div className="decision-copy"><span className="eyebrow">BEFORE YOU BUY</span><h3>What will this cost your future self?</h3><p>Test a purchase first. See the ripple effect before spending a rupee.</p></div>
              <button className="primary-btn" onClick={() => setShowSim(true)}>Simulate a decision <span>↗</span></button>
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
              {expenses.slice(0, 4).map(expense => <div className="transaction-row" key={expense.id}><div className="transaction-icon">{expense.icon || '💸'}</div><div className="transaction-info"><strong>{expense.name}</strong><small>{expense.category} · {dayLabel(expense.day)}</small></div><span className="transaction-amount">−{money(expense.amount)}</span><button className="remove-btn" onClick={() => setExpenses(current => current.filter(item => item.id !== expense.id))}>Remove</button></div>)}
              {!expenses.length && <div className="empty-state">Your next money move starts here.</div>}
            </section>
          </>}

          {page === 'Transactions' && <section className="page-panel panel">
            <div className="panel-head"><div><h3>Every rupee, accounted for.</h3><p>Record expenses and see the impact instantly.</p></div><button className="primary-btn small" onClick={() => setShowAdd(true)}>＋ Add expense</button></div>
            <div className="filter-row">{['All', ...categories].map(category => <button key={category} className={filter === category ? 'filter active-filter' : 'filter'} onClick={() => setFilter(category)}>{category}</button>)}</div>
            {expenses.filter(expense => filter === 'All' || expense.category === filter).map(expense => <div className="transaction-row" key={expense.id}><div className="transaction-icon">{expense.icon || '💸'}</div><div className="transaction-info"><strong>{expense.name}</strong><small>{expense.category} · {dayLabel(expense.day)}</small></div><span className="transaction-amount">−{money(expense.amount)}</span><button className="remove-btn" onClick={() => { setExpenses(current => current.filter(item => item.id !== expense.id)); notify('Expense removed and saved') }}>Remove</button></div>)}
            {!expenses.length && <div className="empty-state">Your next money move starts here.</div>}
          </section>}

          {page === 'Forecast' && <section className="page-panel panel">
            <div className="panel-head"><div><h3>30-day money forecast</h3><p>Estimate what remains after spending and unpaid commitments.</p></div><span className="forecast-chip">DEMO ESTIMATE</span></div>
            <div className="forecast-big">{money(projected)}<span> projected after known bills</span></div>
            <div className="large-chart">{Array.from({ length: 10 }, (_, index) => {
              const value = Math.max(0, projected - index * daily * 3 - bills.filter(bill => !bill.paid && bill.day > day && bill.day <= day + index * 3).reduce((sum, bill) => sum + bill.amount, 0))
              return <div className="bar-column" key={index}><span>{money(value)}</span><i style={{ height: `${Math.max(3, value / budget * 100)}%` }} /><small>{Math.min(30, day + index * 3)}</small></div>
            })}</div>
            <div className="insight-box"><span>✳</span><div><strong>Your money insight</strong><p>{daily < 100 ? 'Your daily allowance is getting tight. Review optional spending before making a big purchase.' : 'You have some breathing room. Keep upcoming commitments in mind before making bigger purchases.'}</p></div></div>
            <p className="fine-print">Forecasts are estimates based on recorded expenses and unpaid commitments, not financial advice.</p>
          </section>}

          {page === 'Savings' && <section className="page-panel panel">
            <div className="panel-head"><div><h3>Build your future fund.</h3><p>Give your money a reason to stay.</p></div><span className="mini-tag">YOUR GOALS</span></div>
            <div className="savings-hero"><div className="savings-ring" style={{ '--progress': `${Math.min(100, savings / Math.max(1, goal) * 100)}%` }}><div><strong>{Math.round(Math.min(100, savings / Math.max(1, goal) * 100))}%</strong><small>COMPLETE</small></div></div><div><span className="eyebrow">MAIN SAVINGS GOAL</span><h2>Future you fund</h2><p>{money(savings)} saved of {money(goal)}</p><strong className="savings-left">{money(Math.max(0, goal - savings))} to go</strong></div></div>
            <div className="savings-controls"><label>Goal amount<input type="number" min="1" value={goal} onChange={event => setGoal(Math.max(1, Number(event.target.value)))} /></label><label>Current savings<input type="number" min="0" value={savings} onChange={event => setSavings(Math.min(budget, Math.max(0, Number(event.target.value))))} /></label></div>
            <button className="primary-btn" onClick={persist}>Save goal progress ↗</button>
          </section>}

          {page === 'Commitments' && <section className="page-panel panel">
            <div className="panel-head"><div><h3>The money you already owe.</h3><p>Upcoming bills are removed from your safe-to-spend estimate.</p></div><span className="mini-tag">{bills.filter(bill => !bill.paid).length} UPCOMING</span></div>
            <div className="commitment-total"><span>UNPAID COMMITMENTS</span><strong>{money(unpaidBills)}</strong><p>Keep this amount aside before optional purchases.</p></div>
            {bills.map(bill => <div className="bill-row" key={bill.id}><div className="bill-icon">{bill.paid ? '✓' : '↗'}</div><div className="transaction-info"><strong>{bill.name}</strong><small>Due on day {bill.day} · {bill.paid ? 'Marked paid' : 'Upcoming'}</small></div><strong className="bill-amount">{money(bill.amount)}</strong><button className={bill.paid ? 'paid-button' : 'mark-paid'} onClick={() => toggleBill(bill.id)}>{bill.paid ? 'Undo' : 'Mark paid'}</button></div>)}
            <p className="fine-print">Demo commitments are sample data stored on this device.</p>
          </section>}

          <footer className="footer"><span>◉ PULSE FINANCE SIMULATOR</span><span>BUILT FOR BETTER MONEY MOVES · DEMO DATA</span><button onClick={resetDemo}>Reset demo ↻</button></footer>
        </div>
      </main>

      {showAdd && <div className="modal-backdrop" onClick={() => setShowAdd(false)}><form className="modal" onSubmit={addExpense} onClick={event => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setShowAdd(false)}>×</button><span className="eyebrow">NEW MONEY MOVE</span><h2>Add an expense</h2><p>Keep your timeline honest.</p><label>What did you spend on?<input autoFocus value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="e.g. Lunch with friends" maxLength="70" /></label><label>Amount (₹)<input type="number" min="1" max={remaining} value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} placeholder="450" /></label><label>Category<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}>{categories.map(category => <option key={category}>{category}</option>)}</select></label><button className="primary-btn full-btn" type="submit">Add to timeline ↗</button></form></div>}

      {showSim && <div className="modal-backdrop" onClick={() => setShowSim(false)}><form className="modal simulation-modal" onSubmit={applySimulation} onClick={event => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setShowSim(false)}>×</button><span className="eyebrow">THE FUTURE SELF SIMULATOR</span><h2>Can you afford the feeling?</h2><p>Preview a purchase before it becomes a transaction.</p><label>What are you thinking of buying?<input value={sim.name} maxLength="70" onChange={event => setSim({ ...sim, name: event.target.value })} /></label><label>Price (₹)<input type="number" min="1" value={sim.amount} onChange={event => setSim({ ...sim, amount: event.target.value })} /></label><label>Category<select value={sim.category} onChange={event => setSim({ ...sim, category: event.target.value })}>{categories.map(category => <option key={category}>{category}</option>)}</select></label><div className="simulation-result"><div><span>Balance after purchase</span><strong>{money(remaining - Math.max(0, Number(sim.amount) || 0))}</strong></div><div><span>New daily allowance</span><strong>{money(Math.max(0, (remaining - Math.max(0, Number(sim.amount) || 0) - unpaidBills - savings) / Math.max(1, 31 - day + 1)))}</strong></div><p>{Number(sim.amount) > remaining * 0.3 ? '⚠ This is a big move. Think about your upcoming commitments.' : '✳ Check the forecast, then decide what feels right.'}</p></div><button className="primary-btn full-btn" type="submit">Commit this decision ↗</button></form></div>}

      {toast && <div className="toast"><span>✓</span>{toast}</div>}
      {saved && <span className="sr-only">Progress saved</span>}
    </div>
  )
}
