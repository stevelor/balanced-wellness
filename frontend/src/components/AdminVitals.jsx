import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function AdminVitals() {
  const [vitals, setVitals] = useState({ pending: 0, today: 0, thisWeek: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVitals()
  }, [])

  const fetchVitals = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('appointments').select('appointment_date, status')
    
    if (!error && data) {
      const now = new Date()
      // Formats today into the 'YYYY-MM-DD' structure to match your database
      const todayString = now.toLocaleDateString('en-CA') 
      
      // Calculate start and end of the current week (Sunday to Saturday)
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      const endOfWeek = new Date(now)
      endOfWeek.setDate(now.getDate() + (6 - now.getDay()))

      const startString = startOfWeek.toLocaleDateString('en-CA')
      const endString = endOfWeek.toLocaleDateString('en-CA')

      let pendingCount = 0
      let todayCount = 0
      let weekCount = 0

      data.forEach(apt => {
        if (apt.status === 'pending') pendingCount++
        
        // Only count confirmed appointments for Today and This Week
        if (apt.status === 'confirmed') {
          if (apt.appointment_date === todayString) todayCount++
          if (apt.appointment_date >= startString && apt.appointment_date <= endString) weekCount++
        }
      })

      setVitals({ pending: pendingCount, today: todayCount, thisWeek: weekCount })
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
      
      {/* Pending Action Widget */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #ddd', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', borderTop: '4px solid #FDE68A' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Action Needed</h4>
        <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#92400E' }}>
          {loading ? '-' : vitals.pending}
        </div>
        <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '0.85rem' }}>Pending Requests</p>
      </div>

      {/* Today Widget */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #ddd', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', borderTop: '4px solid #899E8B' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sessions Today</h4>
        <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#2c3e50' }}>
          {loading ? '-' : vitals.today}
        </div>
        <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '0.85rem' }}>Confirmed clients</p>
      </div>

      {/* This Week Widget */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #ddd', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', borderTop: '4px solid #60A5FA' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>This Week</h4>
        <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#1E3A8A' }}>
          {loading ? '-' : vitals.thisWeek}
        </div>
        <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '0.85rem' }}>Total confirmed sessions</p>
      </div>

    </div>
  )
}