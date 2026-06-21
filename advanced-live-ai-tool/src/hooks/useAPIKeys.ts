/**
 * useAPIKeys — Hook to manage non-sensitive client configuration.
 * Secret API keys (OpenAI, Deepgram) are NOT stored in localStorage —
 * they live server-side only. Only the backend URL is persisted here.
 */
import { useState, useCallback } from 'react'

export interface APIKeys {
    supabaseUrl: string
    supabaseAnonKey: string
    backendUrl: string
}

const STORAGE_KEY = 'ig_api_config'

function getEnvKeys(): APIKeys {
    return {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
        supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        backendUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
    }
}

export function useAPIKeys() {
    const [keys, setKeys] = useState<APIKeys>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
                const parsed = JSON.parse(stored)
                const envKeys = getEnvKeys()
                return {
                    supabaseUrl: parsed.supabaseUrl || envKeys.supabaseUrl,
                    supabaseAnonKey: parsed.supabaseAnonKey || envKeys.supabaseAnonKey,
                    backendUrl: parsed.backendUrl || envKeys.backendUrl,
                }
            }
        } catch { /* ignore */ }
        return getEnvKeys()
    })

    const isConfigured = !!keys.backendUrl

    const updateKey = useCallback((key: keyof APIKeys, value: string) => {
        setKeys(prev => {
            const updated = { ...prev, [key]: value }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
            return updated
        })
    }, [])

    const updateAllKeys = useCallback((newKeys: Partial<APIKeys>) => {
        setKeys(prev => {
            const updated = { ...prev, ...newKeys }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
            return updated
        })
    }, [])

    const resetToEnv = useCallback(() => {
        const envKeys = getEnvKeys()
        setKeys(envKeys)
        localStorage.removeItem(STORAGE_KEY)
    }, [])

    return {
        keys,
        isConfigured,
        updateKey,
        updateAllKeys,
        resetToEnv,
    }
}
