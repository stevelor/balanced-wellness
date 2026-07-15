import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Navbar from '../components/Navbar'
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

export default function ClientPortal() {
  const [services, setServices] = useState([])
  const [availability, setAvailability] = useState([]) 
  const [selectedService, setSelectedService] = useState('')
  const [date, setDate] = useState(null) 
  const [time, setTime] = useState(null) 
  const [statusMessage, setStatusMessage] = useState('')
  const [myAppointments, setMyAppointments] = useState([])

  useEffect(() => {
    fetchServices()
    fetchMyAppointments()
    fetchAvailability() 
  }, [])

  const fetchServices = async () => {
    const { data, error } = await supabase.from('services').select('*')
    if (!error) setServices(data)
  }

  const fetchAvailability = async () => {
    const { data, error } = await supabase.from('availability').select('*')
    if (!error) setAvailability(data)
  }

  const fetchMyAppointments = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data, error } = await supabase
        .from('appointments')
        .select(`id, appointment_date, start_time, status, services (name)`)
        .eq('client_id', user.id)
        .order('appointment_date', { ascending: true })

      if (!error) setMyAppointments(data)
    }
  }

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
          service_id: selectedService,
          appointment_date: formattedDate,
          start_time: formattedTime,
          status: 'pending'
        }
      ])

    if (error) {
      setStatusMessage(`Error: ${error.message}`)
    } else {
      setStatusMessage('Your session has been successfully requested! Sending confirmation...')
      
      // TRIGGER THE SUPABASE EDGE FUNCTION TO SEND THE EMAILS
      try {
        await supabase.functions.invoke('send-email', {
          body: { 
            clientEmail: user.email, 
            clientName: user.user_metadata?.full_name || 'Client',
            serviceName: services.find(s => s.id === selectedService)?.name,
            date: formattedDate,
            time: formattedTime
          }
        })
        setStatusMessage('Your session has been successfully requested and a confirmation email has been sent!')
      } catch (emailError) {
        console.error("Email failed to send:", emailError)
        // We still tell them it was booked, even if the email notification failed
        setStatusMessage('Your session has been requested, but there was an issue sending the confirmation email.')
      }

      setSelectedService('')
      setDate(null)
      setTime(null)
      fetchMyAppointments() 
    }
  }

  return (
    <>
      <Navbar />
      
      <div style={{ maxWidth: '700px', margin: '40px auto', padding: '20px' }}>
        <h2>Schedule Your Healing Session</h2>
        <hr style={{ marginBottom: '20px', border: 'none', borderBottom: '1px solid #ddd' }} />

        <div style={{ backgroundColor: '#F4F1EA', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
          <h3>Book Your Session</h3>
          
          {availability.length > 0 && (
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
            
            <button type="submit" style={{ padding: '14px', backgroundColor: '#899E8B', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.05rem', transition: 'background-color 0.3s ease', marginTop: '10px', boxShadow: '0 4px 6px rgba(137, 158, 139, 0.2)' }}>
              Reserve My Time
            </button>
          </form>
          
          {statusMessage && <p style={{ marginTop: '15px', fontWeight: 'bold', color: statusMessage.includes('Error') || statusMessage.includes('closed') || statusMessage.includes('outside') || statusMessage.includes('Please select') || statusMessage.includes('issue') ? '#D9534F' : '#899E8B' }}>{statusMessage}</p>}
        </div>

        <div>
          <h3>Your Upcoming Sessions</h3>
          {myAppointments.length === 0 ? (
            <p style={{ color: '#666' }}>You have no upcoming sessions at this time.</p>
          ) : (
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {myAppointments.map((apt) => (
                <li key={apt.id} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '10px', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <strong style={{ fontSize: '1.1em', display: 'block', color: '#2c3e50' }}>{apt.services?.name}</strong>
                  <span style={{ color: '#666', display: 'block', margin: '5px 0' }}>Date: {apt.appointment_date} at {apt.start_time.substring(0, 5)}</span>
                  <span style={{ display: 'inline-block', marginTop: '5px', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8em', fontWeight: '500', backgroundColor: apt.status === 'pending' ? '#FDE68A' : apt.status === 'confirmed' ? '#D1FAE5' : '#FEE2E2', color: apt.status === 'pending' ? '#92400E' : apt.status === 'confirmed' ? '#065F46' : '#991B1B' }}>
                    {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}