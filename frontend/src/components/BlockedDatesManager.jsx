import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import Button from './Button'
import toast from 'react-hot-toast'

export default function BlockedDatesManager() {
  const [blockedDates, setBlockedDates] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchBlockedDates()
  }, [])

  const fetchBlockedDates = async () => {
    const { data, error } = await supabase
      .from('blocked_dates')
      .select('*')
      .order('date', { ascending: true })
    if (!error) setBlockedDates(data)
  }

  const handleBlockDate = async (e) => {
    e.preventDefault()
    if (!selectedDate) {
      toast.error("Please select a date to block.")
      return
    }

    setLoading(true)
    const formattedDate = selectedDate.toLocaleDateString('en-CA')

    const { error } = await supabase
      .from('blocked_dates')
      .insert([{ date: formattedDate }])

    if (error) {
      if (error.code === '23505') {
        toast.error("This date is already blocked.")
      } else {
        toast.error(`Error blocking date: ${error.message}`)
      }
    } else {
      toast.success("Date successfully blocked!")
      setSelectedDate(null)
      fetchBlockedDates()
    }
    setLoading(false)
  }

  const handleUnblock = async (id) => {
    const { error } = await supabase
      .from('blocked_dates')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error(`Error removing blocked date: ${error.message}`)
    } else {
      toast.success("Date unblocked successfully.")
      fetchBlockedDates()
    }
  }

  return (
    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', marginTop: '20px' }}>
      <h3>Manage Time Off & Blocked Dates</h3>
      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '15px' }}>
        Block specific days (vacations, holidays) so clients cannot book sessions on those dates.
      </p>

      <form onSubmit={handleBlockDate} style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
        <DatePicker 
          selected={selectedDate} 
          onChange={(d) => setSelectedDate(d)} 
          placeholderText="Select date to block"
          dateFormat="MMMM d, yyyy"
          minDate={new Date()}
          required
        />
        <Button variant="primary" type="submit" disabled={loading}>
          {loading ? 'Blocking...' : 'Block Date'}
        </Button>
      </form>

      <h4>Currently Blocked Dates:</h4>
      {blockedDates.length === 0 ? (
        <p style={{ color: '#888', fontSize: '0.9rem' }}>No dates are currently blocked.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {blockedDates.map(item => (
            <li key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f9f9f9', padding: '8px 12px', borderRadius: '6px', border: '1px solid #eee' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: '500', color: '#2c3e50' }}>{item.date}</span>
              <button 
                type="button" 
                onClick={() => handleUnblock(item.id)}
                style={{ background: 'none', border: 'none', color: '#D9534F', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}