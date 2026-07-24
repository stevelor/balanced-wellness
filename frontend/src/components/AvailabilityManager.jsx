import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Button from './Button'
import toast from 'react-hot-toast'

export default function AvailabilityManager() {
  const [availabilities, setAvailabilities] = useState([])
  const [dayOfWeek, setDayOfWeek] = useState(1) // Defaults to Monday
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

  useEffect(() => {
    fetchAvailabilities()
  }, [])

  const fetchAvailabilities = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .order('day_of_week', { ascending: true })
    
    if (!error) setAvailabilities(data)
    setLoading(false)
  }

  // --- Helper to format 24h time to 12h AM/PM ---
  const formatTime = (timeString) => {
    if (!timeString) return ''
    const [hourStr, minuteStr] = timeString.split(':')
    let hour = parseInt(hourStr, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    hour = hour % 12 || 12
    return `${hour}:${minuteStr} ${ampm}`
  }

  const handleSaveHours = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    const selectedDayInt = parseInt(dayOfWeek)
    const existingDay = availabilities.find(a => a.day_of_week === selectedDayInt)

    if (existingDay) {
      // Smart Update: If the day already exists, update the hours instead of creating a duplicate
      const { error } = await supabase
        .from('availability')
        .update({ start_time: startTime, end_time: endTime })
        .eq('id', existingDay.id)
      
      if (error) {
        toast.error(`Error updating hours: ${error.message}`)
      } else {
        toast.success(`${days[selectedDayInt]} hours updated!`)
        fetchAvailabilities()
      }
    } else {
      // Insert: If it's a new day being added
      const { error } = await supabase
        .from('availability')
        .insert([{ day_of_week: selectedDayInt, start_time: startTime, end_time: endTime }])
      
      if (error) {
        toast.error(`Error saving hours: ${error.message}`)
      } else {
        toast.success(`${days[selectedDayInt]} added to schedule!`)
        fetchAvailabilities()
      }
    }
    setIsSubmitting(false)
  }

  const handleDelete = async (id) => {
    const { error } = await supabase
      .from('availability')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error(`Error removing day: ${error.message}`)
    } else {
      toast.success("Working day removed.")
      fetchAvailabilities()
    }
  }

  return (
    <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', border: '1px solid #ddd', marginTop: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
      <h3 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>Weekly Working Hours</h3>
      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '20px' }}>
        Set standard weekly hours. The booking calendar will automatically generate available time slots between these times.
      </p>

      {/* --- ADD/UPDATE HOURS FORM --- */}
      <form onSubmit={handleSaveHours} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', alignItems: 'end', backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '25px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Day of Week</label>
          <select 
            value={dayOfWeek} 
            onChange={(e) => setDayOfWeek(e.target.value)}
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.95rem' }}
          >
            {days.map((day, index) => (
              <option key={index} value={index}>{day}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Start Time</label>
          <input 
            type="time" 
            value={startTime} 
            onChange={(e) => setStartTime(e.target.value)} 
            required
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.95rem', fontFamily: 'sans-serif' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>End Time</label>
          <input 
            type="time" 
            value={endTime} 
            onChange={(e) => setEndTime(e.target.value)} 
            required
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.95rem', fontFamily: 'sans-serif' }}
          />
        </div>

        <Button 
          variant="primary" 
          type="submit" 
          disabled={isSubmitting}
          style={{ height: '40px', backgroundColor: isSubmitting ? '#aebfad' : '#899E8B' }}
        >
          {isSubmitting ? 'Saving...' : 'Set Hours'}
        </Button>
      </form>

      {/* --- CURRENT SCHEDULE DISPLAY --- */}
      <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>Current Schedule</h4>
      
      {loading ? (
        <p style={{ color: '#666' }}>Loading schedule...</p>
      ) : availabilities.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#888', border: '1px dashed #ccc', borderRadius: '8px' }}>
          <p style={{ margin: 0 }}>No weekly hours are set. Clients currently cannot book any sessions.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {availabilities.map(item => (
            <div 
              key={item.id} 
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '12px 15px', borderRadius: '8px', border: '1px solid #eaeaea', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
            >
              <div>
                <strong style={{ display: 'inline-block', width: '100px', color: '#2c3e50' }}>{days[item.day_of_week]}</strong>
                <span style={{ color: '#666' }}>
                  {formatTime(item.start_time)} — {formatTime(item.end_time)}
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => handleDelete(item.id)}
                style={{ background: 'none', border: 'none', color: '#D9534F', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', padding: '5px 10px', borderRadius: '4px', transition: 'background-color 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#FDE2E2'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title="Remove Day"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}