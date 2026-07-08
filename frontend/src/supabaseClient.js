import { createClient } from '@supabase/supabase-js'

// 1. Reach into the .env.local vault and grab the keys
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 2. Open the connection to the database
export const supabase = createClient(supabaseUrl, supabaseAnonKey)