import { useState, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

interface AccordionItem {
    title: string
    content: ReactNode
}

interface AccordionProps {
    items: AccordionItem[]
    className?: string
}

export default function Accordion({ items, className = '' }: AccordionProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(null)

    return (
        <div className={`space-y-3 ${className}`}>
            {items.map((item, index) => (
                <div
                    key={index}
                    className="rounded-xl border border-white/[0.08] overflow-hidden bg-white/[0.02]"
                >
                    <button
                        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/[0.04] transition-colors cursor-pointer"
                        onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    >
                        <span className="font-heading font-semibold text-txt-primary">{item.title}</span>
                        <motion.div
                            animate={{ rotate: openIndex === index ? 180 : 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <ChevronDown className="w-5 h-5 text-txt-secondary" />
                        </motion.div>
                    </button>
                    <AnimatePresence>
                        {openIndex === index && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                            >
                                <div className="px-6 pb-4 text-txt-secondary leading-relaxed">
                                    {item.content}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ))}
        </div>
    )
}
