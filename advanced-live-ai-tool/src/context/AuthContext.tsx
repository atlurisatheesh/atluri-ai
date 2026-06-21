import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authAPI, setToken, clearToken } from '../services/api'

interface UserData {
    id: string
    email: string
    full_name: string
    plan: string
    credits: number
    avatar_url?: string
}

interface AuthContextType {
    user: UserData | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (email: string, password: string) => Promise<void>
    register: (email: string, full_name: string, password: string) => Promise<void>
    logout: () => void
    refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserData | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const token = localStorage.getItem('ig_token')
        if (!token) {
            setIsLoading(false)
            return
        }
        // Validate the token against the server rather than trusting the
        // locally cached user object — catches revoked or expired tokens.
        authAPI.getProfile()
            .then((profile) => {
                setUser(profile)
                localStorage.setItem('ig_user', JSON.stringify(profile))
            })
            .catch(() => {
                clearToken()
            })
            .finally(() => setIsLoading(false))
    }, [])

    const login = async (email: string, password: string) => {
        const data = await authAPI.login(email, password)
        setUser(data.user)
    }

    const register = async (email: string, full_name: string, password: string) => {
        const data = await authAPI.register(email, full_name, password)
        setUser(data.user)
    }

    const logout = () => {
        clearToken()
        setUser(null)
        window.location.href = '/login'
    }

    const refreshUser = async () => {
        try {
            const profile = await authAPI.getProfile()
            setUser(profile)
            localStorage.setItem('ig_user', JSON.stringify(profile))
        } catch {
            // silent fail
        }
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                register,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
