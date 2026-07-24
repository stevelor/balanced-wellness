import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import Card from './Card'
import Button from './Button'
import StatusBadge from './StatusBadge'
import toast from 'react-hot-toast' 

export default function AdminAppointments() {
  const { data: appointments, loading, refetch } = useSupabaseTable('appointments', {
    select: `
      id,
      appointment_date,
      start_time,
      status,
      client_email, 
      services (name)
    `,
    orderBy: 'appointment_date',
    ascending: true, 
  })

  const [processingId, setProcessingId] = useState(null)
  const [showHistory, setShowHistory] = useState(false) 

  const formatTime = (timeString) => {
    if (!timeString) return ''
    const [hourStr, minuteStr] = timeString.split(':')
    let hour = parseInt(hourStr, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    hour = hour % 12 || 12
    return `${hour}:${minuteStr} ${ampm}`
  }

  // --- NEW: Helper to format the date header nicely (e.g., "Monday, August 3, 2026") ---
  const formatDisplayDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  const updateStatus = async (id, newStatus) => {
    setProcessingId(id) 
    const appointment = appointments.find(a => a.id === id)

    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      toast.error(`Error updating status: ${error.message}`)
      setProcessingId(null)
      return
    }

    refetch() 
    toast.success(`Appointment successfully ${newStatus}!`)

    if (appointment) {
      supabase.functions.invoke('send-email', {
        body: {
          clientEmail: appointment.client_email,
          clientName: 'there', 
          serviceName: appointment.services?.name ?? 'Unknown service',
          date: appointment.appointment_date,
          time: formatTime(appointment.start_time),
          status: newStatus,
        },
      }).catch(err => console.error('Email notification failed:', err))
    }
    
    setProcessingId(null)
  }

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const thresholdDate = sevenDaysAgo.toISOString().split('T')[0] 

  let displayedAppointments = appointments.filter(apt => {
    if (showHistory) {
      return apt.appointment_date <= thresholdDate
    } else {
      return apt.appointment_date > thresholdDate
    }
  })

  displayedAppointments.sort((a, b) => {
    const dateA = new Date(`${a.appointment_date}T${a.start_time}`)
    const dateB = new Date(`${b.appointment_date}T${b.start_time}`)
    return showHistory ? dateB - dateA : dateA - dateB
  })

  // --- NEW: Extract unique dates in their currently sorted order ---
  const uniqueDates = [...new Set(displayedAppointments.map(apt => apt.appointment_date))]

  return (
    <Card tone="highlight">
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '10px' }}>
        <h3 style={{ margin: 0 }}>
          {showHistory ? 'Archived Sessions (7+ Days Old)' : 'Incoming & Recent Booking Requests'}
        </h3>
        <Button 
          variant={showHistory ? "primary" : "secondary"} 
          onClick={() => setShowHistory(!showHistory)}
          style={{ fontSize: '0.9rem', padding: '8px 12px' }}
        >
          {showHistory ? '← Back to Upcoming' : 'View Past Appointments'}
        </Button>
      </div>

      {loading ? (
        <p className="loading-text">Loading appointments...</p>
      ) : displayedAppointments.length === 0 ? (
        
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
          <svg 
            width="64" height="64" viewBox="0 0 24 24" 
            fill="none" stroke="#899E8B" strokeWidth="1.2" 
            strokeLinecap="round" strokeLinejoin="round" 
            style={{ marginBottom: '15px', opacity: 0.8 }}
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
            <path d="M9 16l2 2 4-4"></path>
          </svg>
          <h4 style={{ margin: '0 0 8px 0', color: '#374151', fontSize: '1.2rem' }}>
            {showHistory ? 'No archived history.' : "You're all caught up!"}
          </h4>
          <p style={{ margin: 0, fontSize: '0.95rem' }}>
            {showHistory ? 'There are no sessions older than 7 days.' : 'There are no upcoming booking requests right now.'}
          </p>
        </div>

      ) : (
        
        // --- NEW: Map through each unique date to create a grouped section ---
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {uniqueDates.map(dateStr => {
            const aptsForDate = displayedAppointments.filter(apt => apt.appointment_date === dateStr)

            return (
              <div key={dateStr}>
                {/* Section Header for the Date */}
                <h4 style={{ 
                  backgroundColor: '#e9efe9', 
                  padding: '10px 15px', 
                  borderRadius: '6px', 
                  color: '#2c3e50', 
                  margin: '0 0 10px 0',
                  fontSize: '1.05rem',
                  borderLeft: '4px solid #899E8B'
                }}>
                  {formatDisplayDate(dateStr)}
                </h4>
                
                <table className="data-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '30%' }}>Service</th>
                      <th style={{ width: '20%' }}>Time</th>
                      <th style={{ width: '25%', textAlign: 'center' }}>Status</th>
                      {!showHistory && <th style={{ width: '25%', textAlign: 'right' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {aptsForDate.map(apt => (
                      <tr key={apt.id}>
                        <td style={{ fontWeight: 'bold' }}>{apt.services?.name}</td>
                        
                        {/* Only the time is displayed here now since the date is in the header above */}
                        <td style={{ color: '#4b5563' }}>
                          {formatTime(apt.start_time)}
                        </td>
                        
                        <td style={{ textAlign: 'center' }}>
                          <StatusBadge status={apt.status} />
                        </td>
                        
                        {!showHistory && (
                          <td style={{ textAlign: 'right' }}>
                            {apt.status === 'pending' && (
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <Button
                                  variant="success"
                                  className="btn-sm"
                                  disabled={processingId === apt.id}
                                  onClick={() => updateStatus(apt.id, 'confirmed')}
                                >
                                  {processingId === apt.id ? '...' : 'Confirm'}
                                </Button>
                                <Button
                                  variant="danger"
                                  className="btn-sm"
                                  disabled={processingId === apt.id}
                                  onClick={() => updateStatus(apt.id, 'cancelled')}
                                >
                                  {processingId === apt.id ? '...' : 'Cancel'}
                                </Button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}