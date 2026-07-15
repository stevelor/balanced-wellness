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
      services (name)
    `,
    orderBy: 'appointment_date',
    ascending: true,
  })

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      alert(`Error updating status: ${error.message}`)
    } else {
      refetch() // Refresh the list instantly
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