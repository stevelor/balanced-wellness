import { useState } from 'react'
import { supabase } from '../supabaseClient'
import Button from './Button'

export default function ServiceListItem({ service, onChanged }) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(service.name)
  const [duration, setDuration] = useState(service.duration_minutes)
  const [price, setPrice] = useState(service.price)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const startEditing = () => {
    setName(service.name)
    setDuration(service.duration_minutes)
    setPrice(service.price)
    setError('')
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setError('')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error } = await supabase
      .from('services')
      .update({
        name,
        duration_minutes: parseInt(duration),
        price: parseFloat(price),
      })
      .eq('id', service.id)

    setSaving(false)

    if (error) {
      setError(`Error: ${error.message}`)
    } else {
      setIsEditing(false)
      onChanged()
    }
  }

  const handleDelete = async () => {
    const confirmDelete = window.confirm("Are you sure you want to delete this service?")
    if (!confirmDelete) return

    const { error } = await supabase.from('services').delete().eq('id', service.id)
    if (error) alert(`Error deleting: ${error.message}`)
    else onChanged()
  }

  if (isEditing) {
    return (
      <li style={{ border: '1px solid #899E8B', padding: '15px', marginBottom: '10px', borderRadius: '4px' }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="form-group">
            <label>Service Name:</label>
            <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Duration (minutes):</label>
            <input type="number" className="form-input" value={duration} onChange={(e) => setDuration(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Price ($):</label>
            <input type="number" step="0.01" className="form-input" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </div>

          {error && <p className="status-message status-message-error">{error}</p>}

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button type="submit" variant="success" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button type="button" variant="secondary" onClick={cancelEditing} disabled={saving}>
              Cancel
            </Button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '10px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <strong style={{ fontSize: '1.1em' }}>{service.name}</strong>
        <p style={{ margin: '5px 0 0 0', color: '#555' }}>
          {service.duration_minutes} minutes | ${Number(service.price).toFixed(2)}
        </p>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button variant="secondary" onClick={startEditing}>Edit</Button>
        <Button variant="danger" onClick={handleDelete}>Delete</Button>
      </div>
    </li>
  )
}
