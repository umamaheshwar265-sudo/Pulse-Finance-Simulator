
import { useEffect, useMemo, useState } from 'react'
import './App.css'

const initialExpenses = []
const [day, setDay] = useState(1)

const initialBills = [
  { id: 101, name: 'Mobile recharge', amount: 299, day: 8, paid: false },
  { id: 102, name: 'OTT subscription', amount: 149, day: 12, paid: false },
  { id: 103, name: 'Gym membership', amount: 499, day: 18, paid: false },
]

const money = n => '₹' + Math.round(n).toLocaleString('en-IN')
const dayLabel = n => `Day ${n}`

function App() {
  const [budget, setBudget] = useState(10000)
  const [expenses, setExpenses] = useState(initialExpenses)
  const [bills, setBills] = useState(initialBills)
  const [savings, setSavings] = useState(1500)
  const [goal, setGoal] = useState(3000)
  const [day, setDay] = useState(1)
  const [page, setPage] = useState('Overview')
  const [showAdd, setShowAdd] = useState(false)
  const [showSim, setShowSim] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ name: '', amount: '', category: 'Food' })
  const [sim, setSim] = useState({ name: 'New headphones', amount: 2000, category: 'Shopping' })
  const [simApplied, setSimApplied] = useState(false)
  const [filter, setFilter] = useState('All')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('pulse-finance-v1')
      if (stored) {
        const data = JSON.parse(stored)
        if (data.expenses) setExpenses(data.expenses)
        if (data.bills) setBills(data.bills)
        if (data.savings !== undefined) setSavings(data.savings)
        if (data.goal) setGoal(data.goal)
        if (data.day) setDay(data.day)
      }
    } catch {
      // Continue with demo data if browser storage is unavailable.
    }
  }, [])

  const spent = expenses.reduce((sum, e) => sum + e.amount, 0)
  const unpaidBills = bills.filter(b => !b.paid).reduce((sum, b) => sum + b.amount, 0)
  const remaining = budget - spent
  const available = remaining - unpaidBills - savings
  const daily = Math.max(0, available / Math.max(1, 31 - day + 1))
  const projected = remaining - unpaidBills
  const health = Math.max(0, Math.min(100, Math.round((available / budget) * 100 + (savings / budget) * 25)))
  const spentPercent = Math.min(100, (spent / budget) * 100)
  const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Subscriptions', 'Other']
  const categoryColors = ['#c5ff63', '#65d9ca', '#9e8bff', '#ff9e70', '#72b8ff', '#a7adb8']

  const breakdown = useMemo(() => categories.map((name, i) => ({
    name,
    amount: expenses.filter(e => e.category === name).reduce((sum, e) => sum + e.amount, 0),
    color: categoryColors[i],
  })).filter(c => c.amount > 0), [expenses])

  const future = useMemo(() => {
    let running = budget
    return Array.from({ length: 7 }, (_, i) => {
      const d = Math.min(30, day + i * 4)
      const due = bills.filter(b => !b.paid && b.day > day && b.day <= d).reduce((sum, b) => sum + b.amount, 0)
      running = Math.max(0, remaining - due - (i * daily * 4))
      return { label: d, value: running }
    })
  }, [budget, day, expenses, bills, remaining, daily])

  function notify(message) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  function persist() {
    try {
      localStorage.setItem('pulse-finance-v1', JSON.stringify({ expenses, bills, savings, goal, day }))
      setSaved(true)
      notify('Progress saved on this device')
    } catch {
      notify('Could not save locally in this browser')
    }
  }

  function addExpense(e) {
    e.preventDefault()
    const amount = Number(form.amount)
    if (!form.name.trim() || !Number.isFinite(amount) || amount <= 0) {
      notify('Enter a valid name and amount')
      return
    }
    if (amount > remaining) {
      notify('That expense exceeds your remaining budget')
      return
    }
    setExpenses(prev => [{ id: Date.now(), name: form.name.trim(), amount, category: form.category, day, icon: '💸' }, ...prev])
    setForm({ name: '', amount: '', category: 'Food' })
    setShowAdd(false)
    notify('Expense added to your money timeline')
  }

  function applySimulation() {
    const amount = Number(sim.amount)
    if (!sim.name.trim() || !Number.isFinite(amount) || amount <= 0) {
      notify('Enter a valid purchase and amount')
      return
    }
    if (amount > remaining) {
      notify('This purchase exceeds your remaining balance')
      return
    }
    setExpenses(prev => [{ id: Date.now(), name: sim.name.trim(), amount, category: sim.category, day, icon: '🛍️' }, ...prev])
    setSimApplied(true)
    setShowSim(false)
    notify('Decision applied. Your forecast has updated.')
  }

  function toggleBill(id) {
    setBills(prev => prev.map(b => b.id === id ? { ...b, paid: !b.paid } : b))
    notify('Commitment status updated')
  }

  function resetDemo() {
    setBudget(10000)
    setExpenses(initialExpenses)
    setBills(initialBills)
    setSavings(1500)
    setGoal(3000)
    setDay(1)
    setSimApplied(false)
    try { localStorage.removeItem('pulse-finance-v1') } catch {}
    notify('Demo reset to the original ₹10,000 budget')
  }

  const nav = [
    ['Overview', '◫'],
    ['Transactions', '↕'],
    ['Forecast', '⌁'],
    ['Savings', '◎'],
    ['Commitments', '▤'],
  ]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" onClick={() => setPage('Overview')}>
          <span className="brand-mark">p.</span>
          <span>PULSE<small>MONEY, IN MOTION</small></span>
        </a>

        <div className="side-label">YOUR SPACE</div>
        <nav className="side-nav">
          {nav.map(([name, icon]) => (
            <button key={name} className={page === name ? 'nav-item active' : 'nav-item'} onClick={() => setPage(name)}>
              <span className="nav-icon">{icon}</span>{name}
              {name === 'Commitments' && <span className="nav-count">{bills.filter(b => !b.paid).length}</span>}
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
                <button onClick={() => setDay(d => Math.max(1, d - 1))} disabled={day <= 1}>−</button>
                <strong>DAY {String(day).padStart(2, '0')}<small> / 30</small></strong>
                <button onClick={() => setDay(d => Math.min(30, d + 1))} disabled={day >= 30}>+</button>
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
                <div className="metric-number">{money(daily)}</div>
                <p>After bills & savings</p>
                <div className="metric-bottom"><span>↘ Keep it under control</span></div>
              </div>
              <div className="metric-card">
                <div className="card-top"><span>SAVINGS GOAL</span><span className="metric-symbol">◎</span></div>
                <div className="metric-number">{money(savings)}<small> / {money(goal)}</small></div>
                <div className="goal-track"><i style={{ width: `${Math.min(100, savings / goal * 100)}%` }} /></div>
                <p>{Math.round(Math.min(100, savings / goal * 100))}% of your target</p>
              </div>
            </section>

            <section className="section-heading">
              <div><span className="section-index">01</span><h2>The money map</h2><p>See where your ₹10K is going.</p></div>
              <button className="text-button" onClick={() => setPage('Transactions')}>All transactions ↗</button>
            </section>

            <section className="analytics-grid">
              <div className="panel spending-panel">
                <div className="panel-head"><div><h3>Spending breakdown</h3><p>Your money has a pattern.</p></div><span className="mini-tag">THIS MONTH</span></div>
                <div className="breakdown-layout">
                  <div className="donut-wrap">
                    <div className="donut" style={{ background: `conic-gradient(${breakdown.map((c, i) => `${c.color} ${breakdown.slice(0, i).reduce((s, x) => s + x.amount, 0) / Math.max(1, spent) * 100}% ${(breakdown.slice(0, i).reduce((s, x) => s + x.amount, 0) + c.amount) / Math.max(1, spent) * 100}%`).join(', ') || '#262d31 0% 100%'}` }}>
                      <div><strong>{money(spent)}</strong><small>TOTAL SPENT</small></div>
                    </div>
                  </div>
                  <div className="legend">
                    {breakdown.map(c => <div className="legend-row" key={c.name}><span className="legend-dot" style={{ background: c.color }} /><span>{c.name}</span><strong>{money(c.amount)}</strong></div>)}
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
                    <defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#c5ff63" stopOpacity=".24" /><stop offset="100%" stopColor="#c5ff63" stopOpacity="0" /></linearGradient></defs>
                    {[15, 65, 115].map(y => <line key={y} x1="0" x2="440" y1={y} y2={y} stroke="#293135" strokeDasharray="4 5" />)}
                    <path d={`M 0 20 ${future.map((p, i) => `L ${i * 73.3} ${Math.max(15, 120 - (p.value / budget) * 105)}`).join(' ')} L 440 140 L 0 140 Z`} fill="url(#chartFill)" />
                    <path d={`M 0 20 ${future.map((p, i) => `L ${i * 73.3} ${Math.max(15, 120 - (p.value / budget) * 105)}`).join(' ')}`} fill="none" stroke="#c5ff63" strokeWidth="2.5" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="chart-footer"><span>NOW</span><span>DAY {Math.min(30, day + 4)}</span><span>DAY {Math.min(30, day + 12)}</span><span>DAY 30</span></div>
              </div>
            </section>

            <section className="decision-banner">
              <div className="decision-symbol">↗</div>
              <div className="decision-copy"><span className="eyebrow">BEFORE YOU BUY</span><h3>What will this cost your future self?</h3><p>Test a purchase first. See the ripple effect before spending a rupee.</p></div>
              <button className="primary-btn" onClick={() => { setSimApplied(false); setShowSim(true) }}>Simulate a decision <span>↗</span></button>
            </section>

            <section className="section-heading compact-heading">
              <div><span className="section-index">02</span><h2>Recent moves</h2><p>Every rupee leaves a footprint.</p></div>
              <button className="text-button" onClick={() => setShowAdd(true)}>＋ Add expense</button>
            </section>
            <section className="panel transactions-panel">
              {expenses.slice(0, 4).map(e => <div className="transaction-row" key={e.id}><div className="transaction-icon">{e.icon}</div><div className="transaction-info"><strong>{e.name}</strong><small>{e.category} · {dayLabel(e.day)}</small></div><span className="transaction-amount">−{money(e.amount)}</span><span className="transaction-status">Recorded</span></div>)}
            </section>
          </>}

          {page === 'Transactions' && <section className="page-panel panel">
            <div className="panel-head"><div><h3>Every rupee, accounted for.</h3><p>Record expenses and see the impact instantly.</p></div><button className="primary-btn small" onClick={() => setShowAdd(true)}>＋ Add expense</button></div>
            <div className="filter-row">{['All', ...categories].map(c => <button key={c} className={filter === c ? 'filter active-filter' : 'filter'} onClick={() => setFilter(c)}>{c}</button>)}</div>
            {expenses.filter(e => filter === 'All' || e.category === filter).map(e => <div className="transaction-row" key={e.id}><div className="transaction-icon">{e.icon}</div><div className="transaction-info"><strong>{e.name}</strong><small>{e.category} · {dayLabel(e.day)}</small></div><span className="transaction-amount">−{money(e.amount)}</span><button className="remove-btn" onClick={() => setExpenses(prev => prev.filter(x => x.id !== e.id))}>Remove</button></div>)}
            {!expenses.length && <div className="empty-state">Your next money move starts here.</div>}
          </section>}

          {page === 'Forecast' && <section className="page-panel panel">
            <div className="panel-head"><div><h3>30-day money forecast</h3><p>Estimate what remains after spending and unpaid commitments.</p></div><span className="forecast-chip">DEMO ESTIMATE</span></div>
            <div className="forecast-big">{money(projected)}<span> projected after known bills</span></div>
            <div className="large-chart">
              {Array.from({ length: 10 }, (_, i) => {
                const value = Math.max(0, projected - (i * daily * 3) - bills.filter(b => !b.paid && b.day > day && b.day <= day + i * 3).reduce((s, b) => s + b.amount, 0))
                return <div className="bar-column" key={i}><span>{money(value)}</span><i style={{ height: `${Math.max(3, value / budget * 100)}%` }} /><small>{Math.min(30, day + i * 3)}</small></div>
              })}
            </div>
            <div className="insight-box"><span>✳</span><div><strong>Your money insight</strong><p>{daily < 100 ? 'Your daily allowance is getting tight. Review optional spending before making a big purchase.' : 'You have some breathing room. Keep upcoming commitments in mind before making bigger purchases.'}</p></div></div>
            <p className="fine-print">Forecasts are estimates based on the demo data, recorded expenses and unpaid commitments, not financial advice.</p>
          </section>}

          {page === 'Savings' && <section className="page-panel panel">
            <div className="panel-head"><div><h3>Build your future fund.</h3><p>Give your money a reason to stay.</p></div><span className="mini-tag">YOUR GOALS</span></div>
            <div className="savings-hero"><div className="savings-ring" style={{ '--progress': `${Math.min(100, savings / goal * 100)}%` }}><div><strong>{Math.round(Math.min(100, savings / goal * 100))}%</strong><small>COMPLETE</small></div></div><div><span className="eyebrow">MAIN SAVINGS GOAL</span><h2>Future you fund</h2><p>{money(savings)} saved of {money(goal)}</p><strong className="savings-left">{money(Math.max(0, goal - savings))} to go</strong></div></div>
            <div className="savings-controls"><label>Goal amount<input type="number" min="1" value={goal} onChange={e => setGoal(Math.max(1, Number(e.target.value)))} /></label><label>Current savings<input type="number" min="0" value={savings} onChange={e => setSavings(Math.min(budget, Math.max(0, Number(e.target.value))))} /></label></div>
            <button className="primary-btn" onClick={persist}>Save goal progress ↗</button>
          </section>}

          {page === 'Commitments' && <section className="page-panel panel">
            <div className="panel-head"><div><h3>The money you already owe.</h3><p>Upcoming bills are removed from your safe-to-spend estimate.</p></div><span className="mini-tag">{bills.filter(b => !b.paid).length} UPCOMING</span></div>
            <div className="commitment-total"><span>UNPAID COMMITMENTS</span><strong>{money(unpaidBills)}</strong><p>Keep this amount aside before optional purchases.</p></div>
            {bills.map(b => <div className="bill-row" key={b.id}><div className="bill-icon">{b.paid ? '✓' : '↗'}</div><div className="transaction-info"><strong>{b.name}</strong><small>Due on day {b.day} · {b.paid ? 'Marked paid' : 'Upcoming'}</small></div><strong className="bill-amount">{money(b.amount)}</strong><button className={b.paid ? 'paid-button' : 'mark-paid'} onClick={() => toggleBill(b.id)}>{b.paid ? 'Undo' : 'Mark paid'}</button></div>)}
            <p className="fine-print">Demo commitments are editable through their status. Add your real commitments only on your own device.</p>
          </section>}

          <footer className="footer"><span>◉ PULSE FINANCE SIMULATOR</span><span>BUILT FOR BETTER MONEY MOVES · DEMO DATA</span><button onClick={resetDemo}>Reset demo ↻</button></footer>
        </div>
      </main>

      {showAdd && <div className="modal-backdrop" onClick={() => setShowAdd(false)}><form className="modal" onSubmit={addExpense} onClick={e => e.stopPropagation()}><button type="button" className="modal-close" onClick={() => setShowAdd(false)}>×</button><span className="eyebrow">NEW MONEY MOVE</span><h2>Add an expense</h2><p>Keep your timeline honest.</p><label>What did you spend on?<input autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Lunch with friends" maxLength="70" /></label><label>Amount (₹)<input type="number" min="1" max={remaining} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="450" /></label><label>Category<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{categories.map(c => <option key={c}>{c}</option>)}</select></label><button className="primary-btn full-btn" type="submit">Add to timeline ↗</button></form></div>}

      
{showSim && (
  <div
    className="modal-backdrop"
    onClick={() => setShowSim(false)}
  >
    <form
      className="modal simulation-modal"
      onSubmit={(e) => {
        e.preventDefault()
        applySimulation()
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="modal-close"
        onClick={() => setShowSim(false)}
      >
        ×
      </button>

      <span className="eyebrow">THE FUTURE SELF SIMULATOR</span>
      <h2>Can you afford the feeling?</h2>
      <p>Preview a purchase before it becomes a transaction.</p>

      <label>
        What are you thinking of buying?
        <input
          value={sim.name}
          maxLength="70"
          onChange={(e) => setSim({ ...sim, name: e.target.value })}
        />
      </label>

      <label>
        Price (₹)
        <input
          type="number"
          min="1"
          value={sim.amount}
          onChange={(e) => setSim({ ...sim, amount: e.target.value })}
        />
      </label>

      <label>
        Category
        <select
          value={sim.category}
          onChange={(e) => setSim({ ...sim, category: e.target.value })}
        >
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>

      <div className="simulation-result">
        <div>
          <span>Balance after purchase</span>
          <strong>
            {money(remaining - Math.max(0, Number(sim.amount) || 0))}
          </strong>
        </div>

        <div>
          <span>New daily allowance</span>
          <strong>
            {money(
              Math.max(
                0,
                (
                  remaining -
                  Math.max(0, Number(sim.amount) || 0) -
                  unpaidBills -
                  savings
                ) / Math.max(1, 31 - day + 1)
              )
            )}
          </strong>
        </div>

        <p>
          {Number(sim.amount) > remaining * 0.3
            ? '⚠ This is a big move. Think about your upcoming commitments.'
            : '✳ Check the forecast, then decide what feels right.'}
        </p>
      </div>

      <button className="primary-btn full-btn" type="submit">
        Commit this decision ↗
      </button>
    </form>
  </div>
)}


      {toast && <div className="toast"><span>✓</span>{toast}</div>}
      {saved && <span className="sr-only">Progress saved</span>}
    </div>
  )
}

export default App
