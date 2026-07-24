import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import Card from './Card'
import Button from './Button'
import StatusBadge from './StatusBadge'
import toast from 'react-hot-toast' // <-- New Toast import

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

  // NEW: Tracks which specific appointment row is currently saving
  const [processingId, setProcessingId] = useState(null)

  const updateStatus = async (id, newStatus) => {
    setProcessingId(id) // Disables the buttons for this specific row
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
          time: appointment.start_time,
          status: newStatus,
        },
      }).catch(err => console.error('Email notification failed:', err))
    }
    
    setProcessingId(null)
  }

  return (
    <Card tone="highlight">
      <h3>Incoming Booking Requests</h3>

      {loading ? (
        <p className="loading-text">Loading appointments...</p>
      ) : appointments.length === 0 ? (
        
        // --- NEW: Beautiful Empty State Illustration ---
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
          <h4 style={{ margin: '0 0 8px 0', color: '#374151', fontSize: '1.2rem' }}>You're all caught up!</h4>
          <p style={{ margin: 0, fontSize: '0.95rem' }}>There are no upcoming booking requests right now.</p>
        </div>

      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Date & Time</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map(apt => (
              <tr key={apt.id}>
                <td style={{ fontWeight: 'bold' }}>{apt.services?.name}</td>
                <td>
                  {apt.appointment_date} @ {apt.start_time.substring(0, 5)}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <StatusBadge status={apt.status} />
                </td>
                <td style={{ textAlign: 'right' }}>
                  {apt.status === 'pending' && (
                    <>
                      <Button
                        variant="success"
                        className="btn-sm"
                        style={{ marginRight: '5px' }}
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
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}