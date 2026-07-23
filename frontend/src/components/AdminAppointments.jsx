import { supabase } from '../supabaseClient'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import Card from './Card'
import Button from './Button'
import StatusBadge from './StatusBadge'

export default function AdminAppointments() {
  const { data: appointments, loading, refetch } = useSupabaseTable('appointments', {
    select: `
      id,
      appointment_date,
      start_time,
      status,
      client_email,
      client_name, 
      services (name)
    `,
    orderBy: 'appointment_date',
    ascending: true,
  })

  const updateStatus = async (id, newStatus) => {
    const appointment = appointments.find(a => a.id === id)

    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      alert(`Error updating status: ${error.message}`)
      return
    }

    refetch() // Refresh the list instantly

    // Let the client know by email — don't block the UI if this fails
    if (appointment) {
      supabase.functions.invoke('send-email', {
        body: {
          // These keys now perfectly match what the Edge Function expects!
          clientEmail: appointment.client_email,
          clientName: appointment.client_name, 
          serviceName: appointment.services?.name ?? 'Unknown service',
          date: appointment.appointment_date,
          time: appointment.start_time,
          status: newStatus,
        },
      }).catch(err => console.error('Email notification failed:', err))
    }
  }

  return (
    <Card tone="highlight">
      <h3>Incoming Booking Requests</h3>

      {loading ? (
        <p className="loading-text">Loading appointments...</p>
      ) : appointments.length === 0 ? (
        <p className="empty-text">No appointments booked yet.</p>
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
                        onClick={() => updateStatus(apt.id, 'confirmed')}
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="danger"
                        className="btn-sm"
                        onClick={() => updateStatus(apt.id, 'cancelled')}
                      >
                        Cancel
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