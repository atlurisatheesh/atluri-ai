/**
 * useAPIKeys — Hook to manage and auto-load API keys from environment variables.
 * Keys auto-populate from VITE_ env vars and persist to localStorage for runtime overrides.
 */
import { useState, useEffect, useCallback } from 'react'

export interface APIKeys {
    openai: string
    deepgram: string
    supabaseUrl: string
    supabaseAnonKey: string
    backendUrl: string
}

const STORAGE_KEY = 'ig_api_keys'

function getEnvKeys(): APIKeys {
    return {
        openai: import.meta.env.VITE_OPENAI_API_KEY || '',
        deepgram: import.meta.env.VITE_DEEPGRAM_API_KEY || '',
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
        supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        backendUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
    }
}

export function useAPIKeys() {
    const [keys, setKeys] = useState<APIKeys>(() => {
        // First try localStorage overrides, then fall back to env vars
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
                const parsed = JSON.parse(stored)
                const envKeys = getEnvKeys()
                return {
                    openai: parsed.openai || envKeys.openai,
                    deepgram: parsed.deepgram || envKeys.deepgram,
                    supabaseUrl: parsed.supabaseUrl || envKeys.supabaseUrl,
                    supabaseAnonKey: parsed.supabaseAnonKey || envKeys.supabaseAnonKey,
                    backendUrl: parsed.backendUrl || envKeys.backendUrl,
                }
            }
        } catch { /* ignore */ }
        return getEnvKeys()
    })

    const [isConfigured, setIsConfigured] = useState(false)

    useEffect(() => {
        setIsConfigured(!!keys.openai && !!keys.deepgram)
    }, [keys])

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
