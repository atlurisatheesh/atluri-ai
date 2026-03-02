/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                bg: {
                    primary: '#050508',
                    secondary: '#0D0D14',
                    card: '#12121F',
                },
                brand: {
                    cyan: '#00D4FF',
                    'cyan-dim': '#0099BB',
                    purple: '#7B2FFF',
                    orange: '#FF6B35',
                    green: '#00FF88',
                    amber: '#FFB800',
                    red: '#FF4466',
                },
                txt: {
                    primary: '#F0F0FF',
                    secondary: '#8B8BA7',
                    muted: '#4A4A6A',
                },
            },
            fontFamily: {
                display: ['Clash Display', 'sans-serif'],
                heading: ['Syne', 'sans-serif'],
                body: ['DM Sans', 'sans-serif'],
                code: ['JetBrains Mono', 'monospace'],
            },
            borderRadius: {
                sm: '8px',
                md: '12px',
                lg: '20px',
                xl: '32px',
            },
            animation: {
                'glow-pulse': 'glow-pulse 2s ease-in-out infinite alternate',
                'float': 'float 6s ease-in-out infinite',
                'slide-up': 'slide-up 0.5s ease-out',
                'fade-in': 'fade-in 0.5s ease-out',
                'shimmer': 'shimmer 2s linear infinite',
                'ticker': 'ticker 30s linear infinite',
            },
            keyframes: {
                'glow-pulse': {
                    '0%': { boxShadow: '0 0 20px rgba(0,212,255,0.2)' },
                    '100%': { boxShadow: '0 0 40px rgba(0,212,255,0.5), 0 0 80px rgba(0,212,255,0.15)' },
                },
                'float': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                'slide-up': {
                    from: { opacity: '0', transform: 'translateY(20px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                'fade-in': {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                'shimmer': {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                'ticker': {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
            },
        },
    },
    plugins: [],
}
