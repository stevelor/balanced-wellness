import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import Navbar from '../components/Navbar'
import Card from '../components/Card'
import Button from '../components/Button'
import StatusBadge from '../components/StatusBadge'
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

export default function ClientPortal() {
  // undefined = still checking, null = no user, string = user id.
  // useSupabaseTable's `eq` filter skips fetching until this resolves.
  const [userId, setUserId] = useState(undefined)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
    })
  }, [])

  const { data: services, loading: servicesLoading } = useSupabaseTable('services')
  const { data: availability, loading: availabilityLoading } = useSupabaseTable('availability')
  const {
    data: myAppointments,
    loading: appointmentsLoading,
    refetch: refetchMyAppointments,
  } = useSupabaseTable('appointments', {
    select: `id, appointment_date, start_time, status, services (name)`,
    orderBy: 'appointment_date',
    ascending: true,
    eq: { column: 'client_id', value: userId },
  })

  const [selectedService, setSelectedService] = useState('')
  const [date, setDate] = useState(null)
  const [time, setTime] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')

  const handleBooking = async (e) => {
    e.preventDefault()

    if (!selectedService) {
      setStatusMessage("Please select a healing service for your session.")
      return
    }
    if (!date || !time) {
      setStatusMessage("Please select both a valid date and time.")
      return
    }

    setStatusMessage('Checking schedule...')

    // Format the Date objects for Supabase (YYYY-MM-DD and HH:MM)
    const formattedDate = date.toLocaleDateString('en-CA')
    const formattedTime = time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

    const dayOfWeek = date.getDay()
    const dayRules = availability.filter(a => a.day_of_week === dayOfWeek)

    if (dayRules.length === 0) {
      setStatusMessage("We are currently closed on this day of the week. Please select another day.")
      return
    }

    const isValidTime = dayRules.some(rule => {
      const ruleStart = rule.start_time.substring(0, 5)
      const ruleEnd = rule.end_time.substring(0, 5)
      return formattedTime >= ruleStart && formattedTime <= ruleEnd
    })

    if (!isValidTime) {
      setStatusMessage("The selected time falls outside of our available hours. Please choose a different time.")
      return
    }

    setStatusMessage('Reserving your time...')
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('appointments')
      .insert([
        {
          client_id: user.id,
          client_email: user.email,
          service_id: selectedService,
          appointment_date: formattedDate,
          start_time: formattedTime,
          status: 'pending'
        }
      ])

    if (error) {
      setStatusMessage(`Error: ${error.message}`)
    } else {
      setStatusMessage('Your session has been successfully requested!')
      setSelectedService('')
      setDate(null)
      setTime(null)
      refetchMyAppointments()

      // Let the admin know a new booking came in — don't block the UI if this fails
      const bookedService = services.find(s => s.id === selectedService)
      supabase.functions.invoke('send-email', {
        body: {
          type: 'new_appointment',
          serviceName: bookedService?.name ?? 'Unknown service',
          appointmentDate: formattedDate,
          startTime: formattedTime,
          clientEmail: user.email,
        },
      }).catch(err => console.error('Email notification failed:', err))
    }
  }

  const isErrorMessage =
    statusMessage.includes('Error') ||
    statusMessage.includes('closed') ||
    statusMessage.includes('outside') ||
    statusMessage.includes('Please select')

  return (
    <>
      <Navbar />

      <div className="page-container">
        <h2>Schedule Your Healing Session</h2>
        <hr style={{ marginBottom: '20px', border: 'none', borderBottom: '1px solid #ddd' }} />

        <Card tone="soft">
          <h3>Book Your Session</h3>

          {availabilityLoading ? (
            <p className="loading-text">Loading available hours...</p>
          ) : availability.length > 0 && (
            <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '4px', fontSize: '0.85em', color: '#555', marginBottom: '20px' }}>
              <strong>Available Hours:</strong>
              <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px' }}>
                {availability.map(a => (
                  <li key={a.id}>
                     Day {a.day_of_week}: {a.start_time.substring(0, 5)} - {a.end_time.substring(0, 5)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleBooking} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: '500' }}>How can we help you heal today?</label>
              {servicesLoading ? (
                <p className="loading-text">Loading services...</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  {services.map(service => (
                    <div
                      key={service.id}
                      onClick={() => setSelectedService(service.id)}
                      style={{
                        padding: '15px',
                        border: selectedService === service.id ? '2px solid #899E8B' : '1px solid #ddd',
                        borderRadius: '8px',
                        backgroundColor: selectedService === service.id ? '#e9efe9' : '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: selectedService === service.id ? '0 4px 8px rgba(0,0,0,0.05)' : 'none'
                      }}
                    >
                      <h4 style={{ margin: '0 0 8px 0', color: '#2c3e50', fontSize: '1.1em' }}>{service.name}</h4>
                      <p style={{ margin: '0 0 5px 0', fontSize: '0.9em', color: '#666' }}>{service.duration_minutes} minutes</p>
                      <p style={{ margin: '0', fontWeight: 'bold', color: '#899E8B' }}>${Number(service.price).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '5px' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50' }}>Choose a Date:</label>
                <DatePicker
                  selected={date}
                  onChange={(d) => setDate(d)}
                  minDate={new Date()}
                  placeholderText="Select your date"
                  dateFormat="MMMM d, yyyy"
                  required
                />
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50' }}>Choose a Time:</label>
                <DatePicker
                  selected={time}
                  onChange={(t) => setTime(t)}
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={30}
                  timeCaption="Time"
                  dateFormat="h:mm aa"
                  placeholderText="Select your time"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              style={{ padding: '14px', borderRadius: '8px', fontSize: '1.05rem', marginTop: '10px', boxShadow: '0 4px 6px rgba(137, 158, 139, 0.2)' }}
            >
              Reserve My Time
            </Button>
          </form>

          {statusMessage && (
            <p className={`status-message ${isErrorMessage ? 'status-message-error' : 'status-message-success'}`}>
              {statusMessage}
            </p>
          )}
        </Card>

        <div>
          <h3>Your Upcoming Sessions</h3>
          {appointmentsLoading ? (
            <p className="loading-text">Loading your sessions...</p>
          ) : myAppointments.length === 0 ? (
            <p className="empty-text">You have no upcoming sessions at this time.</p>
          ) : (
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {myAppointments.map((apt) => (
                <li key={apt.id} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '10px', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <strong style={{ fontSize: '1.1em', display: 'block', color: '#2c3e50' }}>{apt.services?.name}</strong>
                  <span style={{ color: '#666', display: 'block', margin: '5px 0' }}>Date: {apt.appointment_date} at {apt.start_time.substring(0, 5)}</span>
                  <StatusBadge status={apt.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}