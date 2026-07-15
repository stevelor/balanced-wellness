import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import Card from './Card'
import Button from './Button'

export default function AvailabilityManager() {
  const { data: availabilityList, loading, refetch } = useSupabaseTable('availability', {
    orderBy: 'day_of_week',
    ascending: true,
  })

  const [dayOfWeek, setDayOfWeek] = useState('1') // Default to Monday
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [statusMessage, setStatusMessage] = useState('')

  const daysMap = {
    0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
    4: 'Thursday', 5: 'Friday', 6: 'Saturday'
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
      refetch()
    }
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('availability').delete().eq('id', id)
    if (error) alert(`Error deleting: ${error.message}`)
    else refetch()
  }

  return (
    <Card tone="muted">
      <h3>Set Weekly Working Hours</h3>

      <form onSubmit={handleAddAvailability} style={{ display: 'flex', gap: '10px', alignItems: 'end', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div className="form-group">
          <label>Day of Week:</label>
          <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)} style={{ padding: '8px' }}>
            {Object.entries(daysMap).map(([num, name]) => (
              <option key={num} value={num}>{name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Start Time:</label>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required style={{ padding: '8px' }} />
        </div>

        <div className="form-group">
          <label>End Time:</label>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required style={{ padding: '8px' }} />
        </div>

        <Button type="submit" variant="primary" style={{ backgroundColor: '#007bff' }}>
          Add Hours
        </Button>
      </form>

      {statusMessage && (
        <p className={`status-message ${statusMessage.includes('Error') ? 'status-message-error' : 'status-message-success'}`}>
          {statusMessage}
        </p>
      )}

      {loading ? (
        <p className="loading-text">Loading availability...</p>
      ) : availabilityList.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Hours</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {availabilityList.map(slot => (
              <tr key={slot.id}>
                <td style={{ fontWeight: 'bold' }}>{daysMap[slot.day_of_week]}</td>
                <td>
                  {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn-link-danger" onClick={() => handleDelete(slot.id)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}