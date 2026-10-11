
export default function SectionHeading({
  index,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <section className={`section-heading ${className}`}>
      <div>
        <span className="section-index">{index}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      {actionLabel && onAction && (
        <button
          type="button"
          className="text-button"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      )}
    </section>
  )
}
