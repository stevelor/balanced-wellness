// Shared button. Variants map to the brand colors defined in App.css,
// so a color change only ever needs to happen in one place.
export default function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button className={`btn btn-${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}
