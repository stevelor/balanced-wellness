import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Button from './Button'
import toast from 'react-hot-toast'

export default function BlockedDatesManager() {
  const [blockedDates, setBlockedDates] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchBlockedDates()
  }, [])

  const fetchBlockedDates = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('blocked_dates')
      .select('*')
      .order('date', { ascending: true })
    
    if (!error && data) {
      setBlockedDates(data)
    }
    setLoading(false)
  }

  const formatDisplayDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
  }

  const handleAddBlockedDate = async (e) => {
    e.preventDefault()
    if (!selectedDate) return

    setIsSubmitting(true)

    // Check if the date is already blocked to prevent duplicates
    const alreadyBlocked = blockedDates.find(b => b.date === selectedDate)
    if (alreadyBlocked) {
      toast.error("This date is already blocked.")
      setIsSubmitting(false)
      return
    }

    const { error } = await supabase
      .from('blocked_dates')
      .insert([{ date: selectedDate }])

    if (error) {
      toast.error(`Error blocking date: ${error.message}`)
    } else {
      toast.success("Date successfully blocked!")
      setSelectedDate('')
      fetchBlockedDates()
    }
    setIsSubmitting(false)
  }

  const handleRemove = async (id) => {
    const { error } = await supabase
      .from('blocked_dates')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error(`Error removing blocked date: ${error.message}`)
    } else {
      toast.success("Date unblocked.")
      fetchBlockedDates()
    }
  }

  // Filter out dates that have already passed so the list doesn't get cluttered forever
  const todayString = new Date().toLocaleDateString('en-CA')
  const upcomingBlockedDates = blockedDates.filter(b => b.date >= todayString)

  return (
    <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', border: '1px solid #ddd', marginTop: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
      <h3 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>Time Off & Blocked Dates</h3>
      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '20px' }}>
        Select specific dates when you are closed (holidays, vacations). Clients will not be able to select these days on the calendar.
      </p>

      {/* --- ADD BLOCKED DATE FORM --- */}
      <form onSubmit={handleAddBlockedDate} style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'end', backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '25px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 200px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Select a Date to Block</label>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
            required
            min={todayString}
            style={{ padding: '9px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.95rem', fontFamily: 'sans-serif' }}
          />
        </div>

        <Button 
          variant="primary" 
          type="submit" 
          disabled={isSubmitting}
          style={{ height: '42px', padding: '0 25px', backgroundColor: isSubmitting ? '#fca5a5' : '#D9534F', border: 'none' }}
        >
          {isSubmitting ? 'Blocking...' : 'Block Date'}
        </Button>
      </form>

      {/* --- CURRENT BLOCKED DATES --- */}
      <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>Upcoming Blocked Dates</h4>
      
      {loading ? (
        <p style={{ color: '#666' }}>Loading dates...</p>
      ) : upcomingBlockedDates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#888', border: '1px dashed #ccc', borderRadius: '8px' }}>
          <p style={{ margin: 0 }}>You have no upcoming blocked dates.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
          {upcomingBlockedDates.map(item => (
            <div 
              key={item.id} 
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '12px 15px', borderRadius: '8px', border: '1px solid #eaeaea', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
            >
              <strong style={{ color: '#2c3e50', fontSize: '0.95rem' }}>
                {formatDisplayDate(item.date)}
              </strong>
              <button 
                type="button" 
                onClick={() => handleRemove(item.id)}
                style={{ background: 'none', border: 'none', color: '#D9534F', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', padding: '5px 10px', borderRadius: '4px', transition: 'background-color 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#FDE2E2'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title="Remove Block"
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}