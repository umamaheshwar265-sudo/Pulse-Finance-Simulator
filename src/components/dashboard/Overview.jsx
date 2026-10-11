
export default function Overview({
  money,
  remaining,
  spent,
  budget,
  daily,
  savings,
  goal,
  available,
}) {
  return (
    <>
      <section className="balance-grid">
        <div className="balance-card">
          <div className="card-top">
            <span>AVAILABLE BALANCE</span>
            <span>↗</span>
          </div>
          <div className="balance-number">{money(remaining)}</div>
          <div className="balance-bottom">
            <span>Spent {money(spent)}</span>
            <span>Budget {money(budget)}</span>
          </div>
        </div>

        <div className="metric-card lime-card">
          <div className="card-top">SAFE TO SPEND / DAY</div>
          <div className="metric-number">{money(daily)}</div>
          <p>After bills &amp; savings</p>
        </div>

        <div className="metric-card">
          <div className="card-top">SAVINGS GOAL</div>
          <div className="metric-number">
            {money(savings)} <small>/ {money(goal)}</small>
          </div>
        </div>
      </section>

      {available < 0 && (
        <div className="budget-alert" role="status">
          <strong>Spending plan needs attention</strong>
          <span>Review your budget and commitments.</span>
        </div>
      )}
    </>
  )
}
