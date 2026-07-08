import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function AvailabilityManager() {
  const [availabilityList, setAvailabilityList] = useState([])
  const [dayOfWeek, setDayOfWeek] = useState('1') // Default to Monday
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [statusMessage, setStatusMessage] = useState('')

  const daysMap = {
    0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
    4: 'Thursday', 5: 'Friday', 6: 'Saturday'
  }

  useEffect(() => {
    fetchAvailability()
  }, [])

  const fetchAvailability = async () => {
    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .order('day_of_week', { ascending: true })

    if (error) console.error('Error fetching availability:', error)
    else setAvailabilityList(data)
  }

  const handleAddAvailability = async (e) => {
    e.preventDefault()
    setStatusMessage('Saving hours...')

    const { error } = await supabase
      .from('availability')
      .insert([{ day_of_week: parseInt(dayOfWeek), start_time: startTime, end_time: endTime }])

    if (error) {
      setStatusMessage(`Error: ${error.message}`)
    } else {
      setStatusMessage('Hours saved successfully!')
      fetchAvailability()
    }
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('availability').delete().eq('id', id)
    if (error) alert(`Error deleting: ${error.message}`)
    else fetchAvailability()
  }

  return (
    <div style={{ backgroundColor: '#e9ecef', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
      <h3>Set Weekly Working Hours</h3>
      
      <form onSubmit={handleAddAvailability} style={{ display: 'flex', gap: '10px', alignItems: 'end', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.9em' }}>Day of Week:</label>
          <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)} style={{ padding: '8px' }}>
            {Object.entries(daysMap).map(([num, name]) => (
              <option key={num} value={num}>{name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.9em' }}>Start Time:</label>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required style={{ padding: '8px' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.9em' }}>End Time:</label>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required style={{ padding: '8px' }} />
        </div>

        <button type="submit" style={{ padding: '9px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Add Hours
        </button>
      </form>

      {statusMessage && <p style={{ color: statusMessage.includes('Error') ? 'red' : 'green', fontSize: '0.9em' }}>{statusMessage}</p>}

      {availabilityList.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc' }}>
              <th style={{ textAlign: 'left', padding: '10px' }}>Day</th>
              <th style={{ textAlign: 'left', padding: '10px' }}>Hours</th>
              <th style={{ textAlign: 'right', padding: '10px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {availabilityList.map(slot => (
              <tr key={slot.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>{daysMap[slot.day_of_week]}</td>
                <td style={{ padding: '10px' }}>
                  {/* Format the time slightly to look better */}
                  {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
                </td>
                <td style={{ padding: '10px', textAlign: 'right' }}>
                  <button onClick={() => handleDelete(slot.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}