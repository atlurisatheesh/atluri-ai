import { useState, ReactNode } from 'react'
import { motion } from 'framer-motion'

interface Tab {
    label: string
    content: ReactNode
    icon?: ReactNode
}

interface TabsProps {
    tabs: Tab[]
    className?: string
}

export default function Tabs({ tabs, className = '' }: TabsProps) {
    const [active, setActive] = useState(0)

    return (
        <div className={className}>
            <div className="flex gap-1 border-b border-white/[0.08] overflow-x-auto pb-px">
                {tabs.map((tab, i) => (
                    <button
                        key={i}
                        className={`relative px-5 py-3 text-sm font-heading font-semibold whitespace-nowrap transition-colors cursor-pointer ${active === i ? 'text-brand-cyan' : 'text-txt-secondary hover:text-txt-primary'
                            }`}
                        onClick={() => setActive(i)}
                    >
                        <span className="flex items-center gap-2">
                            {tab.icon}
                            {tab.label}
                        </span>
                        {active === i && (
                            <motion.div
                                className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brand-cyan to-brand-purple"
                                layoutId="tab-underline"
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                            />
                        )}
                    </button>
                ))}
            </div>
            <motion.div
                key={active}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="pt-6"
            >
                {tabs[active].content}
            </motion.div>
        </div>
    )
}
