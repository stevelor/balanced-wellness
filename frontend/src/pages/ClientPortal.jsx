import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Navbar from '../components/Navbar'
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import toast from 'react-hot-toast'

export default function ClientPortal() {
  const [services, setServices] = useState([])
  const [availability, setAvailability] = useState([]) 
  const [blockedDates, setBlockedDates] = useState([]) 
  const [selectedService, setSelectedService] = useState('')
  const [date, setDate] = useState(null) 
  const [time, setTime] = useState(null) 
  const [clientName, setClientName] = useState('') // <-- NEW: Stores the client's name
  const [myAppointments, setMyAppointments] = useState([])
  const [bookedSlots, setBookedSlots] = useState([]) 
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cancellingId, setCancellingId] = useState(null)

  useEffect(() => {
    fetchUserAccount() // Fetch the user's saved name
    fetchServices()
    fetchMyAppointments()
    fetchAvailability() 
    fetchBlockedDates()
  }, [])

  // --- NEW: Checks if they have a name saved to their account already ---
  const fetchUserAccount = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user && user.user_metadata?.full_name) {
      setClientName(user.user_metadata.full_name)
    }
  }

  useEffect(() => {
    if (date) {
      const fetchBookedSlotsForDate = async () => {
        const formattedDate = date.toLocaleDateString('en-CA')
        const { data, error } = await supabase
          .from('appointments')
          .select('start_time, status')
          .eq('appointment_date', formattedDate)
          .neq('status', 'cancelled')
        
        if (!error && data) {
          const takenTimes = data.map(apt => apt.start_time.substring(0, 5))
          setBookedSlots(takenTimes)
        }
      }
      fetchBookedSlotsForDate()
    } else {
      setBookedSlots([])
    }
  }, [date])

  const fetchServices = async () => {
    const { data, error } = await supabase.from('services').select('*')
    if (!error) setServices(data)
  }

  const fetchAvailability = async () => {
    const { data, error } = await supabase.from('availability').select('*')
    if (!error) setAvailability(data)
  }

  const fetchBlockedDates = async () => {
    const { data, error } = await supabase.from('blocked_dates').select('date')
    if (!error && data) {
      const dateObjects = data.map(item => {
        const [year, month, day] = item.date.split('-').map(Number)
        return new Date(year, month - 1, day)
      })
      setBlockedDates(dateObjects)
    }
  }

  const fetchMyAppointments = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data, error } = await supabase
        .from('appointments')
        .select(`id, appointment_date, start_time, status, client_email, services (name)`)
        .eq('client_id', user.id)
        .order('appointment_date', { ascending: true })

      if (!error) setMyAppointments(data)
    }
  }

  const availableDaysOfWeek = availability.map(a => a.day_of_week)

  const isDaySelectable = (date) => {
    const day = date.getDay()
    return availableDaysOfWeek.includes(day)
  }

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
        const timeString = `${formattedHour}:${formattedMinute}`
        
        if (!bookedSlots.includes(timeString)) {
          slots.push(timeString)
        }

        currentMinute += 30
        if (currentMinute >= 60) {
          currentMinute = 0
          currentHour += 1
        }
      }
    })
    return slots
  }

  const formatDisplayTime = (timeString) => {
    const [hourStr, minuteStr] = timeString.split(':')
    let hour = parseInt(hourStr, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    hour = hour % 12 || 12
    return `${hour}:${minuteStr} ${ampm}`
  }

  const canCancel = (appointmentDate, startTime) => {
    const [year, month, day] = appointmentDate.split('-').map(Number)
    const [hour, minute] = startTime.substring(0, 5).split(':').map(Number)
    const aptDateTime = new Date(year, month - 1, day, hour, minute)
    const now = new Date()
    return ((aptDateTime - now) / (1000 * 60 * 60)) >= 24
  }

  const handleBooking = async (e) => {
    e.preventDefault()
    
    if (!clientName.trim()) {
      toast.error("Please enter your name.")
      return
    }
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

    // --- NEW: Update the user's account permanently with their name ---
    await supabase.auth.updateUser({ data: { full_name: clientName } })

    const { error } = await supabase
      .from('appointments')
      .insert([
        {
          client_id: user.id,
          client_email: user.email, 
          client_name: clientName, // <-- NEW: Saves to the appointment row
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

    try {
      await supabase.functions.invoke('send-email', {
        body: { 
          clientEmail: user.email, 
          clientName: clientName, // <-- NEW: Uses their actual name in the email!
          serviceName: services.find(s => s.id === selectedService)?.name,
          date: formattedDate,
          time: formatDisplayTime(time) 
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

  const handleCancelAppointment = async (apt) => {
    if (!canCancel(apt.appointment_date, apt.start_time)) {
      toast.error("Appointments cannot be cancelled within 24 hours of the start time.")
      return
    }

    setCancellingId(apt.id)
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', apt.id)

    if (error) {
      toast.error(`Error cancelling appointment: ${error.message}`)
      setCancellingId(null)
      return
    }

    toast.success('Appointment successfully cancelled.')
    fetchMyAppointments()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.functions.invoke('send-email', {
        body: {
          clientEmail: user.email,
          clientName: clientName || 'there',
          serviceName: apt.services?.name ?? 'Healing Session',
          date: apt.appointment_date,
          time: formatDisplayTime(apt.start_time),
          status: 'cancelled',
        },
      })
    } catch (emailErr) {
      console.error('Cancellation email failed:', emailErr)
    }
    setCancellingId(null)
  }

  const timeSlots = getAvailableTimeSlots()

  return (
    <>
      <Navbar />
      
      <div style={{ maxWidth: '700px', margin: '40px auto', padding: '20px' }}>
        
        <div style={{ 
          backgroundColor: '#F4F1EA', 
          padding: '30px 20px', 
          borderRadius: '12px', 
          textAlign: 'center', 
          marginBottom: '30px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <svg 
            width="36" height="36" viewBox="0 0 24 24" 
            fill="none" stroke="#899E8B" strokeWidth="1.5" 
            strokeLinecap="round" strokeLinejoin="round" 
            style={{ marginBottom: '10px' }}
          >
            <path d="M12 2a10 10 0 0 1 7.54 16.6l-1.08-1.08A8 8 0 1 0 12 20v2a10 10 0 0 1 0-20z"></path>
            <path d="M12 6v6l4 2"></path>
          </svg>
          <h2 style={{ color: '#2c3e50', margin: '0 0 8px 0', fontSize: '1.6rem', fontWeight: '500' }}>Welcome to Your Sanctuary</h2>
          <p style={{ color: '#666', margin: 0, fontSize: '1.05rem', fontStyle: 'italic' }}>
            "Take a deep breath and carve out some time for your well-being."
          </p>
        </div>

        <div style={{ backgroundColor: '#F4F1EA', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
          <h3>Book Your Session</h3>

          <form onSubmit={handleBooking} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* --- NEW: Client Name Input --- */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: '600', color: '#2c3e50' }}>Your Full Name:</label>
              <input 
                type="text" 
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Jane Doe"
                required
                disabled={isSubmitting}
                style={{ 
                  padding: '12px', 
                  borderRadius: '6px', 
                  border: '1px solid #ddd', 
                  fontSize: '1rem',
                  fontFamily: 'inherit'
                }}
              />
            </div>

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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: '600', color: '#2c3e50' }}>Choose a Date:</label>
              <DatePicker 
                selected={date} 
                onChange={(d) => { setDate(d); setTime(null); }} 
                minDate={new Date()} 
                excludeDates={blockedDates} 
                filterDate={isDaySelectable} 
                placeholderText="Select your date"
                dateFormat="MMMM d, yyyy"
                required
                disabled={isSubmitting}
                wrapperClassName="date-picker-wrapper"
              />
            </div>

            {date && (
              <div>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#2c3e50' }}>Choose an Available Time Slot:</label>
                {timeSlots.length === 0 ? (
                  <p style={{ color: '#D9534F', fontSize: '0.95rem', margin: 0 }}>
                    There are no available time slots left on this date. Please choose another date.
                  </p>
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

        <div>
          <h3>Your Upcoming Sessions</h3>
          {myAppointments.length === 0 ? (
            <p style={{ color: '#666' }}>You have no upcoming sessions at this time.</p>
          ) : (
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {myAppointments.map((apt) => {
                const isWithin24Hours = !canCancel(apt.appointment_date, apt.start_time)
                return (
                  <li key={apt.id} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '10px', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <strong style={{ fontSize: '1.1em', display: 'block', color: '#2c3e50' }}>{apt.services?.name}</strong>
                      <span style={{ color: '#666', display: 'block', margin: '5px 0' }}>Date: {apt.appointment_date} at {formatDisplayTime(apt.start_time)}</span>
                      <span style={{ display: 'inline-block', marginTop: '5px', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8em', fontWeight: '500', backgroundColor: apt.status === 'pending' ? '#FDE68A' : apt.status === 'confirmed' ? '#D1FAE5' : '#FEE2E2', color: apt.status === 'pending' ? '#92400E' : apt.status === 'confirmed' ? '#065F46' : '#991B1B' }}>
                        {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                      </span>
                    </div>

                    {(apt.status === 'pending' || apt.status === 'confirmed') && (
                      isWithin24Hours ? (
                        <span style={{ fontSize: '0.85rem', color: '#888', fontStyle: 'italic' }}>
                          Cannot cancel within 24h
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={cancellingId === apt.id}
                          onClick={() => handleCancelAppointment(apt)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#fff',
                            color: '#D9534F',
                            border: '1px solid #D9534F',
                            borderRadius: '6px',
                            cursor: cancellingId === apt.id ? 'not-allowed' : 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '500',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {cancellingId === apt.id ? 'Cancelling...' : 'Cancel Appointment'}
                        </button>
                      )
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}