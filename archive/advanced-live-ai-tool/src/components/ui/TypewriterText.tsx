import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface TypewriterTextProps {
    text: string
    speed?: number
    className?: string
    onComplete?: () => void
    cursor?: boolean
}

export default function TypewriterText({ text, speed = 40, className = '', onComplete, cursor = true }: TypewriterTextProps) {
    const [displayed, setDisplayed] = useState('')
    const [done, setDone] = useState(false)

    useEffect(() => {
        setDisplayed('')
        setDone(false)
        let i = 0
        const interval = setInterval(() => {
            if (i < text.length) {
                setDisplayed(text.slice(0, i + 1))
                i++
            } else {
                clearInterval(interval)
                setDone(true)
                onComplete?.()
            }
        }, speed)
        return () => clearInterval(interval)
    }, [text, speed, onComplete])

    return (
        <span className={className}>
            {displayed}
            {cursor && !done && (
                <motion.span
                    className="inline-block w-[2px] h-[1em] bg-brand-cyan ml-0.5 align-middle"
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
                />
            )}
        </span>
    )
}
