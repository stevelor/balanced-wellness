// Shared card/box wrapper. `tone` picks a background color so each section
// (appointments, availability, services, booking) keeps a consistent look
// without repeating inline styles everywhere.
export default function Card({ children, tone = 'default', className = '', style }) {
  return (
    <div className={`card card-${tone} ${className}`.trim()} style={style}>
      {children}
    </div>
  )
}
