import { supabase } from './supabase.js'
import { createSync } from './sync.js'

// The one sync engine the app uses. It is null when Supabase is not set up.
export const sync = supabase ? createSync(supabase, window.localStorage) : null
