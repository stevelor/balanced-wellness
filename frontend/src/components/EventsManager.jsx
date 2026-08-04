import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Button from './Button'
import toast from 'react-hot-toast'

export default function EventsManager() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    start_time: '',
    price: '',
    total_spots: '',
    image_url: ''
  })

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    setLoading(true)
    const today = new Date().toLocaleDateString('en-CA')
    const { data, error } = await supabase
      .from('events')
      .select('*, event_registrations(id)')
      .gte('event_date', today)
      .order('event_date', { ascending: true })
    
    if (!error && data) setEvents(data)
    setLoading(false)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    const payload = {
      title: formData.title,
      description: formData.description,
      event_date: formData.event_date,
      start_time: formData.start_time,
      price: parseFloat(formData.price),
      total_spots: parseInt(formData.total_spots),
      image_url: formData.image_url
    }

    const { error } = await supabase.from('events').insert([payload])

    if (error) {
      toast.error(`Error saving event: ${error.message}`)
    } else {
      toast.success("New event successfully created!")
      setFormData({ title: '', description: '', event_date: '', start_time: '', price: '', total_spots: '', image_url: '' })
      fetchEvents()
    }
    setIsSubmitting(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this event? This will also delete all registrations for it.")) return
    
    const { error } = await supabase.from('events').delete().eq('id', id)
    
    if (error) {
      toast.error(`Cannot delete event: ${error.message}`)
    } else {
      toast.success("Event deleted.")
      fetchEvents()
    }
  }

  const formatTime = (timeString) => {
    const [hourStr, minuteStr] = timeString.split(':')
    let hour = parseInt(hourStr, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    hour = hour % 12 || 12
    return `${hour}:${minuteStr} ${ampm}`
  }

  return (
    <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', border: '1px solid #ddd', marginTop: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
      <h3 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>Special Events & Workshops</h3>
      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '20px' }}>
        Host group events. These will be highlighted at the top of the client portal.
      </p>

      {/* --- CREATE EVENT FORM --- */}
      <form onSubmit={handleSave} style={{ backgroundColor: '#F4F1EA', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #eaeaea' }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#374151' }}>Create a New Event</h4>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 250px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: '600' }}>Event Title</label>
            <input type="text" name="title" value={formData.title} onChange={handleInputChange} required placeholder="e.g., Full Moon Meditation" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 120px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: '600' }}>Date</label>
            <input type="date" name="event_date" value={formData.event_date} onChange={handleInputChange} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 120px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: '600' }}>Start Time</label>
            <input type="time" name="start_time" value={formData.start_time} onChange={handleInputChange} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 100px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: '600' }}>Price ($)</label>
            <input type="number" name="price" value={formData.price} onChange={handleInputChange} required min="0" step="0.01" placeholder="45.00" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 100px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: '600' }}>Total Spots</label>
            <input type="number" name="total_spots" value={formData.total_spots} onChange={handleInputChange} required min="1" placeholder="10" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 100%' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: '600' }}>Description</label>
            <textarea name="description" value={formData.description} onChange={handleInputChange} rows="2" placeholder="What should attendees expect?" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 100%' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: '600' }}>Image URL (Optional)</label>
            <input type="url" name="image_url" value={formData.image_url} onChange={handleInputChange} placeholder="https://example.com/image.jpg" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
        </div>

        <Button variant="primary" type="submit" disabled={isSubmitting} style={{ backgroundColor: '#899E8B', marginTop: '20px' }}>
          {isSubmitting ? 'Publishing...' : 'Publish Event'}
        </Button>
      </form>

      {/* --- EVENTS LIST --- */}
      <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>Upcoming Events</h4>
      {loading ? (
        <p style={{ color: '#666' }}>Loading events...</p>
      ) : events.length === 0 ? (
        <p style={{ color: '#888', fontStyle: 'italic' }}>No upcoming events scheduled.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
          {events.map(ev => {
            const registeredCount = ev.event_registrations?.length || 0;
            return (
              <div key={ev.id} style={{ border: '1px solid #eaeaea', borderRadius: '8px', overflow: 'hidden' }}>
                {ev.image_url && <div style={{ height: '120px', backgroundImage: `url(${ev.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
                <div style={{ padding: '15px' }}>
                  <h4 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>{ev.title}</h4>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#666' }}>
                    {ev.event_date} @ {formatTime(ev.start_time)}<br/>
                    <strong>Spots Filled:</strong> {registeredCount} / {ev.total_spots}
                  </p>
                  <Button variant="danger" className="btn-sm" onClick={() => handleDelete(ev.id)} style={{ width: '100%' }}>
                    Cancel Event
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}