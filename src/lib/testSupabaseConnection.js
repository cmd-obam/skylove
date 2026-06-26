import { supabase } from '@/lib/supabase'

function getMissingEnvVars() {
  const missing = []

  if (!import.meta.env.VITE_SUPABASE_URL) {
    missing.push('VITE_SUPABASE_URL')
  }

  if (!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    missing.push('VITE_SUPABASE_PUBLISHABLE_KEY')
  }

  return missing
}

export async function testSupabaseConnection() {
  const missingEnvVars = getMissingEnvVars()

  if (missingEnvVars.length > 0) {
    console.error(
      `[Supabase] Missing environment variable(s): ${missingEnvVars.join(', ')}`,
    )
    console.error('[Supabase] Check that .env exists in the project root and restart the dev server.')
    return false
  }

  const { error } = await supabase.auth.getSession()

  if (error) {
    console.error('[Supabase] Connection test failed:', error.message)
    return false
  }

  console.log('[Supabase] Connected successfully')
  return true
}
