import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Configuration
const PASSWORD_CHECK_MODE = import.meta.env.VITE_PASSWORD_CHECK_MODE || 'client'
const CORRECT_PASSWORD = '1234'

// Client-side password verification
const verifyPasswordClient = async (password) => {
    try {
        // Simulate a small delay for consistency with server call
        await new Promise(resolve => setTimeout(resolve, 300))
        
        if (password === CORRECT_PASSWORD) {
            const token = btoa(JSON.stringify({
                timestamp: Date.now(),
                verified: true,
                mode: 'client'
            }))

            return { success: true, token, message: 'Authentication successful (client-side)' }
        } else {
            return { success: false, error: 'Invalid password' }
        }
    } catch (error) {
        console.error('Client-side verification error:', error)
        return { success: false, error: 'Verification failed' }
    }
}

// Server-side password verification (Vercel function)
const verifyPasswordServer = async (password) => {
    try {
        const response = await fetch('/api/verify-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password })
        })

        const data = await response.json()
        
        if (data.success) {
            return { success: true, token: data.token, message: 'Authentication successful (server-side)' }
        }
        
        return { success: false, error: data.error || 'Invalid password' }
    } catch (error) {
        console.error('Server-side verification error:', error)
        return { success: false, error: 'Server verification failed' }
    }
}

// Main password verification function with toggle
export const verifyPassword = async (password) => {
    console.log(`🔐 Password verification mode: ${PASSWORD_CHECK_MODE}`)
    
    const result = PASSWORD_CHECK_MODE === 'server' 
        ? await verifyPasswordServer(password)
        : await verifyPasswordClient(password)
    
    if (result.success) {
        // Store session token securely
        sessionStorage.setItem('auth_token', result.token)
        sessionStorage.setItem('auth_timestamp', Date.now().toString())
        sessionStorage.setItem('auth_mode', PASSWORD_CHECK_MODE)
    }
    
    return result
}

// Simple auth check
export const isAuthenticated = () => {
    const token = sessionStorage.getItem('auth_token')
    const timestamp = sessionStorage.getItem('auth_timestamp')
    
    if (!token || !timestamp) return false
    
    // Check if token is expired (24 hours)
    const tokenAge = Date.now() - parseInt(timestamp)
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    
    if (tokenAge > maxAge) {
        logout()
        return false
    }
    
    return true
}

// Simple logout
export const logout = () => {
    sessionStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_timestamp')
}
