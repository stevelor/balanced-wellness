import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Button from './Button'
import toast from 'react-hot-toast'

export default function AdminManualBooking() {
  const [services, setServices] = useState([])
  const [selectedService, setSelectedService] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    const { data, error } = await supabase.from('services').select('*')
    if (!error) setServices(data)
  }

  const handleManualBook = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('appointments')
      .insert([
        {
          client_id: user.id, 
          client_email: clientEmail, 
          client_name: clientName, 
          service_id: selectedService,
          appointment_date: date,
          start_time: time,
          status: 'confirmed' 
        }
      ])

    if (error) {
      toast.error(`Database Error: ${error.message}`)
      setIsSubmitting(false)
      return
    }

    toast.success('Manual appointment successfully added to the schedule!')

    if (clientEmail) {
      try {
        const serviceObj = services.find(s => s.id === selectedService)
        
        const [hourStr, minuteStr] = time.split(':')
        let hour = parseInt(hourStr, 10)
        const ampm = hour >= 12 ? 'PM' : 'AM'
        hour = hour % 12 || 12
        const formattedTime = `${hour}:${minuteStr} ${ampm}`

        // --- UPDATED: Passing duration and price from the selected service ---
        await supabase.functions.invoke('send-email', {
          body: { 
            clientEmail: clientEmail, 
            clientName: clientName || 'Client', 
            serviceName: serviceObj?.name,
            date: date,
            time: formattedTime,
            duration: serviceObj?.duration_minutes || 60,
            price: serviceObj?.price || 0,
            status: 'confirmed'
          }
        })
      } catch (emailError) {
        console.error("Email failed to send:", emailError)
      }
    }

    setClientName('')
    setSelectedService('')
    setClientEmail('')
    setDate('')
    setTime('')
    setIsSubmitting(false)
    
    setTimeout(() => window.location.reload(), 1500)
  }

  return (
    <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', border: '1px solid #ddd', marginTop: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
      <h3 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>Manual Override Booking</h3>
      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '20px' }}>
        Did a client call or text to book? Add them here to block out the time slot. This bypasses all availability rules.
      </p>

      <form onSubmit={handleManualBook} style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'end', backgroundColor: '#F4F1EA', padding: '20px', borderRadius: '8px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 200px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Service</label>
          <select 
            value={selectedService} 
            onChange={(e) => setSelectedService(e.target.value)}
            required
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.95rem' }}
          >
            <option value="" disabled>Select a service...</option>
            {services.map(service => (
              <option key={service.id} value={service.id}>{service.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 150px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Client Name</label>
          <input 
            type="text" 
            placeholder="Jane Doe"
            value={clientName} 
            onChange={(e) => setClientName(e.target.value)} 
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.95rem' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 150px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Client Email (Optional)</label>
          <input 
            type="email" 
            placeholder="client@email.com"
            value={clientEmail} 
            onChange={(e) => setClientEmail(e.target.value)} 
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.95rem' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 150px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Date</label>
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            required
            style={{ padding: '9px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.95rem', fontFamily: 'sans-serif' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 120px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Time</label>
          <input 
            type="time" 
            value={time} 
            onChange={(e) => setTime(e.target.value)} 
            required
            style={{ padding: '9px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.95rem', fontFamily: 'sans-serif' }}
          />
        </div>

        <Button 
          variant="primary" 
          type="submit" 
          disabled={isSubmitting}
          style={{ height: '42px', padding: '0 25px', backgroundColor: isSubmitting ? '#aebfad' : '#899E8B', flex: '1 1 100%' }}
        >
          {isSubmitting ? 'Booking...' : 'Force Add Appointment'}
        </Button>
      </form>
    </div>
  )
}