// Single source of truth for appointment status colors. Previously
// AdminAppointments.jsx and ClientPortal.jsx each had their own slightly
// different pending/confirmed/cancelled color mapping — now there's one.
const STATUS_STYLES = {
  pending: { backgroundColor: '#FDE68A', color: '#92400E' },
  confirmed: { backgroundColor: '#D1FAE5', color: '#065F46' },
  cancelled: { backgroundColor: '#FEE2E2', color: '#991B1B' },
}

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.pending
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'

  return (
    <span className="status-badge" style={style}>
      {label}
    </span>
  )
}
