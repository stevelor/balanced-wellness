import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Navbar from '../components/Navbar'

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState([])

  useEffect(() => {
    fetchAppointments()
  }, [])

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        start_time,
        status,
        services (name)
      `)
      .order('appointment_date', { ascending: true })

    if (error) {
      console.error('Error fetching appointments:', error)
    } else {
      setAppointments(data)
    }
  }

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      alert(`Error updating status: ${error.message}`)
    } else {
      fetchAppointments() // Refresh the list instantly
    }
  }

  // NEW: Function to permanently delete an appointment
  const deleteAppointment = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to permanently delete this appointment?")
    if (!confirmDelete) return

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)

    if (error) {
      alert(`Error deleting appointment: ${error.message}`)
    } else {
      fetchAppointments() // Refresh to clear it from the screen
    }
  }

  return (
    <>
      <Navbar />
    <div style={{ backgroundColor: '#fff3cd', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
      <h3>Incoming Booking Requests</h3>
      
      {appointments.length === 0 ? (
        <p>No appointments booked yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc' }}>
              <th style={{ textAlign: 'left', padding: '10px' }}>Service</th>
              <th style={{ textAlign: 'left', padding: '10px' }}>Date & Time</th>
              <th style={{ textAlign: 'center', padding: '10px' }}>Status</th>
              <th style={{ textAlign: 'right', padding: '10px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map(apt => (
              <tr key={apt.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>{apt.services?.name}</td>
                <td style={{ padding: '10px' }}>
                  {apt.appointment_date} @ {apt.start_time.substring(0, 5)}
                </td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '12px', 
                    fontSize: '0.85em',
                    backgroundColor: apt.status === 'confirmed' ? '#28a745' : apt.status === 'cancelled' ? '#dc3545' : '#ffc107',
                    color: apt.status === 'pending' ? '#000' : '#fff'
                  }}>
                    {apt.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '10px', textAlign: 'right' }}>
                  {/* Status Buttons */}
                  {apt.status === 'pending' && (
                    <>
                      <button onClick={() => updateStatus(apt.id, 'confirmed')} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}>
                        Confirm
                      </button>
                      <button onClick={() => updateStatus(apt.id, 'cancelled')} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}>
                        Cancel
                      </button>
                    </>
                  )}
                  {/* NEW: Delete Button (Visible for all statuses so you can clear history) */}
                  <button onClick={() => deleteAppointment(apt.id)} style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
    </>
  )
}