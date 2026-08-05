import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Button from './Button'
import toast from 'react-hot-toast'

export default function BlockedDatesManager() {
  const [blockedDates, setBlockedDates] = useState([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('') // <-- NEW: End Date state
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

  const handleAddBlockedDates = async (e) => {
    e.preventDefault()
    if (!startDate) return

    setIsSubmitting(true)

    // If no end date is selected, just use the start date (blocking a single day)
    const end = endDate || startDate

    // Check if the user accidentally put an end date before the start date
    if (new Date(end + 'T00:00:00') < new Date(startDate + 'T00:00:00')) {
      toast.error("The End Date cannot be before the Start Date.")
      setIsSubmitting(false)
      return
    }

    // 1. Generate an array of all dates between Start and End
    const datesToBlock = []
    let curr = new Date(startDate + 'T12:00:00') // Using noon to avoid timezone skipping bugs
    const last = new Date(end + 'T12:00:00')

    while (curr <= last) {
      const y = curr.getFullYear()
      const m = String(curr.getMonth() + 1).padStart(2, '0')
      const d = String(curr.getDate()).padStart(2, '0')
      datesToBlock.push(`${y}-${m}-${d}`)
      curr.setDate(curr.getDate() + 1) // Move to the next day
    }

    // 2. Filter out dates that are already blocked in the database to prevent errors
    const existingDates = blockedDates.map(b => b.date)
    const newDatesToInsert = datesToBlock
      .filter(d => !existingDates.includes(d))
      .map(d => ({ date: d })) // Format for Supabase bulk insert

    if (newDatesToInsert.length === 0) {
      toast.error("All of the selected dates are already blocked.")
      setIsSubmitting(false)
      return
    }

    // 3. Insert all new dates into the database at the same time
    const { error } = await supabase
      .from('blocked_dates')
      .insert(newDatesToInsert)

    if (error) {
      toast.error(`Error blocking dates: ${error.message}`)
    } else {
      toast.success(newDatesToInsert.length > 1 ? `${newDatesToInsert.length} dates successfully blocked!` : "Date successfully blocked!")
      setStartDate('')
      setEndDate('')
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

  const todayString = new Date().toLocaleDateString('en-CA')
  const upcomingBlockedDates = blockedDates.filter(b => b.date >= todayString)

  return (
    <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', border: '1px solid #ddd', marginTop: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
      <h3 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>Time Off & Blocked Dates</h3>
      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '20px' }}>
        Select specific dates or a date range when you are closed for vacations or holidays. Clients will not be able to select these days on the calendar.
      </p>

      {/* --- ADD BLOCKED DATE(S) FORM --- */}
      <form onSubmit={handleAddBlockedDates} style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'end', backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '25px', border: '1px solid #eaeaea' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 200px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Start Date</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            required
            min={todayString}
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px', fontFamily: 'sans-serif' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 200px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>End Date (Optional)</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
            min={startDate || todayString} // Prevents selecting an end date before the start date
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px', fontFamily: 'sans-serif' }}
          />
        </div>

        <Button 
          variant="primary" 
          type="submit" 
          disabled={isSubmitting}
          style={{ height: '44px', padding: '0 25px', backgroundColor: isSubmitting ? '#fca5a5' : '#D9534F', border: 'none', flex: '1 1 150px' }}
        >
          {isSubmitting ? 'Blocking...' : (endDate && endDate !== startDate ? 'Block Range' : 'Block Date')}
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