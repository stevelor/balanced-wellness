import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Navbar from '../components/Navbar'
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import toast from 'react-hot-toast'

export default function ClientPortal() {
  const [services, setServices] = useState([])
  const [availability, setAvailability] = useState([]) 
  const [selectedService, setSelectedService] = useState('')
  const [date, setDate] = useState(null) 
  const [time, setTime] = useState(null) // Stores selected time string like '09:00'
  const [myAppointments, setMyAppointments] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  // Helper to generate 30-minute time slots based on availability for the selected day
  const getAvailableTimeSlots = () => {
    if (!date || availability.length === 0) return []
    const dayOfWeek = date.getDay()
    const dayRules = availability.filter(a => a.day_of_week === dayOfWeek)
    
    if (dayRules.length === 0) return []

    let slots = []
    dayRules.forEach(rule => {
      let [currentHour, currentMinute] = rule.start_time.substring(0, 5).split(':').map(Number)
      const [endHour, endMinute] = rule.end_time.substring(0, 5).split(':').map(Number)

      while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
        const formattedHour = String(currentHour).padStart(2, '0')
        const formattedMinute = String(currentMinute).padStart(2, '0')
        slots.push(`${formattedHour}:${formattedMinute}`)

        currentMinute += 30
        if (currentMinute >= 60) {
          currentMinute = 0
          currentHour += 1
        }
      }
    })
    return slots
  }

  // Formats '09:30' into a clean 12-hour display like '9:30 AM'
  const formatDisplayTime = (timeString) => {
    const [hourStr, minuteStr] = timeString.split(':')
    let hour = parseInt(hourStr, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    hour = hour % 12 || 12
    return `${hour}:${minuteStr} ${ampm}`
  }

  const handleBooking = async (e) => {
    e.preventDefault()
    
    if (!selectedService) {
      toast.error("Please select a healing service for your session.")
      return
    }
    if (!date || !time) {
      toast.error("Please select both a valid date and time slot.")
      return
    }

    setIsSubmitting(true)
    const formattedDate = date.toLocaleDateString('en-CA') 

    const { data: { user } } = await supabase.auth.getUser()

    // 1. SAVE TO DATABASE
    const { error } = await supabase
      .from('appointments')
      .insert([
        {
          client_id: user.id,
          client_email: user.email, 
          service_id: selectedService,
          appointment_date: formattedDate,
          start_time: time,
          status: 'pending'
        }
      ])

    if (error) {
      toast.error(`Database Error: ${error.message}`)
      setIsSubmitting(false)
      return
    } 

    // 2. TRIGGER THE EMAIL NOTIFICATION
    try {
      await supabase.functions.invoke('send-email', {
        body: { 
          clientEmail: user.email, 
          clientName: user.user_metadata?.full_name || 'Client',
          serviceName: services.find(s => s.id === selectedService)?.name,
          date: formattedDate,
          time: time
        }
      })
      toast.success('Your session has been successfully requested!')
    } catch (emailError) {
      console.error("Email failed to send:", emailError)
      toast.success('Session requested, but there was an issue sending the email receipt.')
    }

    setSelectedService('')
    setDate(null)
    setTime(null)
    fetchMyAppointments() 
    setIsSubmitting(false)
  }

  const timeSlots = getAvailableTimeSlots()

  return (
    <>
      <Navbar />
      
      <div style={{ maxWidth: '700px', margin: '40px auto', padding: '20px' }}>
        <h2>Schedule Your Healing Session</h2>
        <hr style={{ marginBottom: '20px', border: 'none', borderBottom: '1px solid #ddd' }} />

        <div style={{ backgroundColor: '#F4F1EA', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
          <h3>Book Your Session</h3>

          <form onSubmit={handleBooking} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Service Selection */}
            <div>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: '500' }}>How can we help you heal today?</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                {services.map(service => (
                  <div 
                    key={service.id}
                    onClick={() => !isSubmitting && setSelectedService(service.id)}
                    style={{
                      padding: '15px',
                      border: selectedService === service.id ? '2px solid #899E8B' : '1px solid #ddd',
                      borderRadius: '8px',
                      backgroundColor: selectedService === service.id ? '#e9efe9' : '#fff',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: selectedService === service.id ? '0 4px 8px rgba(0,0,0,0.05)' : 'none',
                      opacity: isSubmitting ? 0.6 : 1,
                    }}
                  >
                    <h4 style={{ margin: '0 0 8px 0', color: '#2c3e50', fontSize: '1.1em' }}>{service.name}</h4>
                    <p style={{ margin: '0 0 5px 0', fontSize: '0.9em', color: '#666' }}>{service.duration_minutes} minutes</p>
                    <p style={{ margin: '0', fontWeight: 'bold', color: '#899E8B' }}>${Number(service.price).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: '600', color: '#2c3e50' }}>Choose a Date:</label>
              <DatePicker 
                selected={date} 
                onChange={(d) => { setDate(d); setTime(null); }} 
                minDate={new Date()} 
                placeholderText="Select your date"
                dateFormat="MMMM d, yyyy"
                required
                disabled={isSubmitting}
                wrapperClassName="date-picker-wrapper"
              />
            </div>

            {/* Smart Clickable Time Chips */}
            {date && (
              <div>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#2c3e50' }}>Choose an Available Time Slot:</label>
                {timeSlots.length === 0 ? (
                  <p style={{ color: '#D9534F', fontSize: '0.95rem', margin: 0 }}>We are closed on this day of the week. Please choose another date.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px' }}>
                    {timeSlots.map(slot => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setTime(slot)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: time === slot ? '2px solid #899E8B' : '1px solid #ddd',
                          backgroundColor: time === slot ? '#899E8B' : '#fff',
                          color: time === slot ? '#fff' : '#2c3e50',
                          fontWeight: time === slot ? 'bold' : 'normal',
                          cursor: 'pointer',
                          fontSize: '0.95rem',
                          textAlign: 'center',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {formatDisplayTime(slot)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={isSubmitting}
              style={{ 
                padding: '14px', 
                backgroundColor: isSubmitting ? '#aebfad' : '#899E8B', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: isSubmitting ? 'not-allowed' : 'pointer', 
                fontWeight: 'bold', 
                fontSize: '1.05rem', 
                transition: 'background-color 0.3s ease', 
                marginTop: '10px', 
                boxShadow: '0 4px 6px rgba(137, 158, 139, 0.2)' 
              }}
            >
              {isSubmitting ? 'Reserving...' : 'Reserve My Time'}
            </button>
          </form>
        </div>

        {/* Upcoming Sessions List */}
        <div>
          <h3>Your Upcoming Sessions</h3>
          {myAppointments.length === 0 ? (
            <p style={{ color: '#666' }}>You have no upcoming sessions at this time.</p>
          ) : (
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {myAppointments.map((apt) => (
                <li key={apt.id} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '10px', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <strong style={{ fontSize: '1.1em', display: 'block', color: '#2c3e50' }}>{apt.services?.name}</strong>
                  <span style={{ color: '#666', display: 'block', margin: '5px 0' }}>Date: {apt.appointment_date} at {formatDisplayTime(apt.start_time)}</span>
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