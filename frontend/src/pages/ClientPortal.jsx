import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Navbar from '../components/Navbar'
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import toast from 'react-hot-toast'

export default function ClientPortal() {
  const [services, setServices] = useState([])
  const [events, setEvents] = useState([]) 
  const [availability, setAvailability] = useState([]) 
  const [blockedDates, setBlockedDates] = useState([]) 
  const [selectedService, setSelectedService] = useState('')
  const [date, setDate] = useState(null) 
  const [time, setTime] = useState(null) 
  const [clientName, setClientName] = useState('') 
  const [myAppointments, setMyAppointments] = useState([])
  const [bookedAppointments, setBookedAppointments] = useState([]) 
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cancellingId, setCancellingId] = useState(null)

  // --- STRIPE & MODAL STATES ---
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    fetchUserAccount() 
    fetchServices()
    fetchEvents() 
    fetchMyAppointments()
    fetchAvailability() 
    fetchBlockedDates()
    handleStripeRedirects() 
  }, [])

  // --- STRIPE: Handle returning from checkout ---
  const handleStripeRedirects = async () => {
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('event_success')
    const canceled = urlParams.get('event_canceled')
    const regId = urlParams.get('reg_id')

    if (success && regId) {
      // 1. Mark their spot as officially registered in the database!
      await supabase.from('event_registrations').update({ status: 'registered' }).eq('id', regId)
      
      // 2. Trigger the big success modal
      setSuccessMessage('Your payment was confirmed and your spot is secured for the event!')
      
      // 3. Clear the URL so it looks clean again
      window.history.replaceState(null, '', window.location.pathname) 
      fetchEvents()
    }

    if (canceled && regId) {
      await supabase.from('event_registrations').delete().eq('id', regId)
      toast.error('Payment was canceled. Your spot was not reserved.')
      window.history.replaceState(null, '', window.location.pathname) 
      fetchEvents()
    }
  }

  const fetchUserAccount = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user && user.user_metadata?.full_name) {
      setClientName(user.user_metadata.full_name)
    }
  }

  const fetchEvents = async () => {
    const today = new Date().toLocaleDateString('en-CA')
    const { data, error } = await supabase
      .from('events')
      .select('*, event_registrations(id, client_id, status)')
      .gte('event_date', today)
      .order('event_date', { ascending: true })
    
    if (!error && data) setEvents(data)
  }

  useEffect(() => {
    if (date) {
      const fetchBookedSlotsForDate = async () => {
        const formattedDate = date.toLocaleDateString('en-CA')
        const { data, error } = await supabase
          .from('appointments')
          .select('start_time, status, services(duration_minutes)')
          .eq('appointment_date', formattedDate)
          .neq('status', 'cancelled')
        
        if (!error && data) {
          const booked = data.map(apt => {
            const [h, m] = apt.start_time.split(':').map(Number)
            const startMins = (h * 60) + m
            const duration = apt.services?.duration_minutes || 60 
            return { startMins, endMins: startMins + duration }
          })
          setBookedAppointments(booked)
        }
      }
      fetchBookedSlotsForDate()
    } else {
      setBookedAppointments([])
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
  const isDaySelectable = (date) => availableDaysOfWeek.includes(date.getDay())

  const getAvailableTimeSlots = () => {
    if (!date || !selectedService || availability.length === 0) return []
    
    const dayOfWeek = date.getDay()
    const dayRules = availability.filter(a => a.day_of_week === dayOfWeek)
    if (dayRules.length === 0) return []

    const selectedServiceObj = services.find(s => s.id === selectedService)
    const proposedDuration = selectedServiceObj ? selectedServiceObj.duration_minutes : 60

    let slots = []
    dayRules.forEach(rule => {
      let [currentHour, currentMinute] = rule.start_time.substring(0, 5).split(':').map(Number)
      const [endHour, endMinute] = rule.end_time.substring(0, 5).split(':').map(Number)
      
      const ruleEndMins = (endHour * 60) + endMinute

      while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
        const slotStartMins = (currentHour * 60) + currentMinute
        const slotEndMins = slotStartMins + proposedDuration

        const formattedHour = String(currentHour).padStart(2, '0')
        const formattedMinute = String(currentMinute).padStart(2, '0')
        const timeString = `${formattedHour}:${formattedMinute}`

        const fitsInWorkingHours = slotEndMins <= ruleEndMins
        const isOverlapping = bookedAppointments.some(bookedApt => {
          return (slotStartMins < bookedApt.endMins) && (slotEndMins > bookedApt.startMins)
        })

        if (fitsInWorkingHours && !isOverlapping) {
          slots.push(timeString)
        }

        currentMinute += 30
        if (currentMinute >= 60) {
          currentMinute -= 60
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
    return ((aptDateTime - new Date()) / (1000 * 60 * 60)) >= 24
  }

  const handleConfirmAndPay = async () => {
    if (!clientName.trim()) {
      toast.error("Please enter your Full Name in the booking form below before registering.")
      return
    }

    setIsProcessingPayment(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data: regData, error: regError } = await supabase
      .from('event_registrations')
      .insert([{
        event_id: selectedEvent.id,
        client_id: user.id,
        client_name: clientName,
        client_email: user.email,
        status: 'pending_payment' 
      }])
      .select()
      .single()

    if (regError) {
      toast.error(`Error: ${regError.message}`)
      setIsProcessingPayment(false)
      return
    }

    try {
      // FIX: Grab the exact current path (like /portal) so Stripe returns them to the right place
      const currentPath = window.location.pathname;

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          eventName: selectedEvent.title,
          price: selectedEvent.price,
          clientEmail: user.email,
          successUrl: `${window.location.origin}${currentPath}?event_success=true&reg_id=${regData.id}`,
          cancelUrl: `${window.location.origin}${currentPath}?event_canceled=true&reg_id=${regData.id}`,
          regId: regData.id // Keeping the Webhook ID connection!
        }
      })

      if (error || !data?.url) throw new Error("Could not reach Stripe.")

      window.location.href = data.url 

    } catch (err) {
      console.error(err)
      toast.error("Error connecting to payment processor. Please try again.")
      await supabase.from('event_registrations').delete().eq('id', regData.id)
      setIsProcessingPayment(false)
    }
  }

  const handleBooking = async (e) => {
    e.preventDefault()
    if (!clientName.trim()) { toast.error("Please enter your name."); return }
    if (!selectedService) { toast.error("Please select a healing service for your session."); return }
    if (!date || !time) { toast.error("Please select both a valid date and time slot."); return }

    setIsSubmitting(true)
    const formattedDate = date.toLocaleDateString('en-CA') 
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.auth.updateUser({ data: { full_name: clientName } })

    const { error } = await supabase
      .from('appointments')
      .insert([
        {
          client_id: user.id, client_email: user.email, client_name: clientName, 
          service_id: selectedService, appointment_date: formattedDate, start_time: time, status: 'pending'
        }
      ])

    if (error) { toast.error(`Database Error: ${error.message}`); setIsSubmitting(false); return } 

    try {
      await supabase.functions.invoke('send-email', {
        body: { 
          clientEmail: user.email, clientName: clientName, 
          serviceName: services.find(s => s.id === selectedService)?.name,
          date: formattedDate, time: formatDisplayTime(time),
          duration: services.find(s => s.id === selectedService)?.duration_minutes || 60,
          price: services.find(s => s.id === selectedService)?.price || 0,
          status: 'pending'
        }
      })
      toast.success('Your session has been successfully requested!')
    } catch (emailError) {
      console.error("Email failed to send:", emailError)
    }

    setSelectedService(''); setDate(null); setTime(null)
    fetchMyAppointments(); setIsSubmitting(false)
  }

  const handleCancelAppointment = async (apt) => {
    if (!canCancel(apt.appointment_date, apt.start_time)) {
      toast.error("Appointments cannot be cancelled within 24 hours of the start time."); return
    }
    setCancellingId(apt.id)
    const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', apt.id)
    if (error) { toast.error(`Error: ${error.message}`); setCancellingId(null); return }
    
    toast.success('Appointment successfully cancelled.')
    fetchMyAppointments()
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.functions.invoke('send-email', {
        body: {
          clientEmail: user.email, clientName: clientName || 'there',
          serviceName: apt.services?.name ?? 'Healing Session',
          date: apt.appointment_date, time: formatDisplayTime(apt.start_time),
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
      
      {/* --- NEW: The Payment Success Modal --- */}
      {successMessage && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', padding: '40px 30px', borderRadius: '12px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>✅</div>
            <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50', fontSize: '1.6rem' }}>You're all set!</h3>
            <p style={{ color: '#666', margin: '0 0 25px 0', lineHeight: '1.5', fontSize: '1.05rem' }}>
              {successMessage}
            </p>
            <button 
              onClick={() => setSuccessMessage('')}
              style={{ padding: '14px', backgroundColor: '#899E8B', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1.05rem', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* --- STRIPE: The Confirmation & Payment Modal --- */}
      {selectedEvent && !successMessage && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', maxWidth: '450px', width: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50', fontSize: '1.4rem' }}>Confirm Registration</h3>
            <p style={{ color: '#666', margin: '0 0 20px 0', lineHeight: '1.5' }}>
              You are about to secure your spot for <strong>{selectedEvent.title}</strong> on {new Date(`${selectedEvent.event_date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.
            </p>
            
            <div style={{ backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #eaeaea' }}>
              <span style={{ fontWeight: '500', color: '#374151' }}>Total Due:</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#899E8B' }}>${selectedEvent.price}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={handleConfirmAndPay}
                disabled={isProcessingPayment}
                style={{ padding: '14px', backgroundColor: '#899E8B', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1.05rem', fontWeight: 'bold', cursor: isProcessingPayment ? 'not-allowed' : 'pointer', opacity: isProcessingPayment ? 0.7 : 1 }}
              >
                {isProcessingPayment ? 'Connecting to Stripe...' : 'Pay with Card & Secure Spot'}
              </button>
              <button 
                onClick={() => setSelectedEvent(null)}
                disabled={isProcessingPayment}
                style={{ padding: '14px', backgroundColor: 'transparent', color: '#666', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem', cursor: isProcessingPayment ? 'not-allowed' : 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile-friendly container limits */}
      <div style={{ maxWidth: '100%', width: '100%', padding: '15px', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '700px', margin: '20px auto 40px auto' }}>
          
          <div style={{ backgroundColor: '#F4F1EA', padding: '25px 15px', borderRadius: '12px', textAlign: 'center', marginBottom: '30px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#899E8B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '10px' }}>
              <path d="M12 2a10 10 0 0 1 7.54 16.6l-1.08-1.08A8 8 0 1 0 12 20v2a10 10 0 0 1 0-20z"></path>
              <path d="M12 6v6l4 2"></path>
            </svg>
            <h2 style={{ color: '#2c3e50', margin: '0 0 8px 0', fontSize: '1.4rem', fontWeight: '500' }}>Welcome to Your Sanctuary</h2>
            <p style={{ color: '#666', margin: 0, fontSize: '1rem', fontStyle: 'italic' }}>
              "Take a deep breath and carve out some time for your well-being."
            </p>
          </div>

          {events.length > 0 && (
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ borderBottom: '2px solid #899E8B', paddingBottom: '8px', display: 'inline-block', marginBottom: '20px', fontSize: '1.2rem' }}>
                ✨ Upcoming Special Events
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                {events.map(ev => {
                  // Only count registrations that actually paid
                  const registeredCount = ev.event_registrations?.filter(r => r.status === 'registered').length || 0;
                  const isFull = registeredCount >= ev.total_spots;

                  return (
                    <div key={ev.id} style={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                      {ev.image_url && (
                        <div style={{ height: '140px', backgroundImage: `url(${ev.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                      )}
                      <div style={{ padding: '15px' }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#2c3e50', fontSize: '1.1rem' }}>{ev.title}</h4>
                        <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '0.9rem' }}>
                          📅 {new Date(`${ev.event_date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}<br/>
                          ⏰ {formatDisplayTime(ev.start_time)}<br/>
                          🎟️ {ev.total_spots - registeredCount} spots remaining
                        </p>
                        
                        {ev.description && (
                          <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: '15px' }}>{ev.description}</p>
                        )}
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                          <strong style={{ fontSize: '1.1rem', color: '#899E8B' }}>${ev.price}</strong>
                          <button 
                            onClick={() => setSelectedEvent(ev)}
                            disabled={isFull}
                            style={{ padding: '10px 15px', backgroundColor: isFull ? '#ccc' : '#899E8B', color: '#fff', border: 'none', borderRadius: '6px', cursor: isFull ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '0.9rem' }}
                          >
                            {isFull ? 'Sold Out' : 'Secure My Spot'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ backgroundColor: '#F4F1EA', padding: '20px 15px', borderRadius: '8px', marginBottom: '30px' }}>
            <h3 style={{ borderBottom: '2px solid #899E8B', paddingBottom: '8px', display: 'inline-block', marginBottom: '20px', fontSize: '1.2rem' }}>
              Book a 1-on-1 Session
            </h3>

            <form onSubmit={handleBooking} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontWeight: '600', color: '#2c3e50', fontSize: '0.95rem' }}>Your Full Name:</label>
                <input 
                  type="text" 
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                  disabled={isSubmitting}
                  style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '16px', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#2c3e50', fontSize: '0.95rem' }}>How can we help you heal today?</label>
                <div className="services-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
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
                      <h4 style={{ margin: '0 0 5px 0', color: '#2c3e50', fontSize: '1rem' }}>{service.name}</h4>
                      <p style={{ margin: '0 0 5px 0', fontSize: '0.85em', color: '#666' }}>{service.duration_minutes} minutes</p>
                      <p style={{ margin: '0', fontWeight: 'bold', color: '#899E8B', fontSize: '0.95rem' }}>${Number(service.price).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontWeight: '600', color: '#2c3e50', fontSize: '0.95rem' }}>Choose a Date:</label>
                <div style={{ width: '100%' }}>
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
                    className="mobile-datepicker-input"
                  />
                </div>
              </div>

              {date && !selectedService && (
                <div style={{ padding: '12px', backgroundColor: '#fff', borderLeft: '4px solid #FDE68A', borderRadius: '6px' }}>
                  <p style={{ color: '#92400E', margin: 0, fontWeight: '500', fontSize: '0.9rem' }}>
                    Please select a healing service above to see available time slots.
                  </p>
                </div>
              )}

              {date && selectedService && (
                <div>
                  <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#2c3e50', fontSize: '0.95rem' }}>Choose an Available Time Slot:</label>
                  {timeSlots.length === 0 ? (
                    <p style={{ color: '#D9534F', fontSize: '0.9rem', margin: 0 }}>
                      There is not enough time left on the calendar for this service. Please choose another date.
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
                      {timeSlots.map(slot => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setTime(slot)}
                          style={{
                            padding: '12px 10px',
                            borderRadius: '6px',
                            border: time === slot ? '2px solid #899E8B' : '1px solid #ddd',
                            backgroundColor: time === slot ? '#899E8B' : '#fff',
                            color: time === slot ? '#fff' : '#2c3e50',
                            fontWeight: time === slot ? 'bold' : 'normal',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            textAlign: 'center',
                            width: '100%'
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
                  padding: '16px', 
                  backgroundColor: isSubmitting ? '#aebfad' : '#899E8B', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  cursor: isSubmitting ? 'not-allowed' : 'pointer', 
                  fontWeight: 'bold', 
                  fontSize: '1.05rem', 
                  marginTop: '10px',
                  width: '100%' 
                }}
              >
                {isSubmitting ? 'Reserving...' : 'Reserve My Time'}
              </button>
            </form>
          </div>

          <div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '15px' }}>Your Upcoming 1-on-1 Sessions</h3>
            {myAppointments.length === 0 ? (
              <p style={{ color: '#666', fontSize: '0.95rem' }}>You have no upcoming sessions at this time.</p>
            ) : (
              <ul style={{ listStyleType: 'none', padding: 0 }}>
                {myAppointments.map((apt) => {
                  const isWithin24Hours = !canCancel(apt.appointment_date, apt.start_time)
                  return (
                    <li key={apt.id} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '10px', borderRadius: '8px', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <strong style={{ fontSize: '1.05em', display: 'block', color: '#2c3e50' }}>{apt.services?.name}</strong>
                        <span style={{ color: '#666', display: 'block', margin: '5px 0', fontSize: '0.9rem' }}>Date: {apt.appointment_date} at {formatDisplayTime(apt.start_time)}</span>
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
                              padding: '10px',
                              backgroundColor: '#fff',
                              color: '#D9534F',
                              border: '1px solid #D9534F',
                              borderRadius: '6px',
                              cursor: cancellingId === apt.id ? 'not-allowed' : 'pointer',
                              fontSize: '0.9rem',
                              fontWeight: '500',
                              width: '100%',
                              textAlign: 'center'
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
      </div>
    </>
  )
}