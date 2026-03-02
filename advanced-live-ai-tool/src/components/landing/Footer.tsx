import { Link } from 'react-router-dom'
import { Zap, Linkedin, Twitter, Youtube, Instagram, MessageCircle } from 'lucide-react'

const footerLinks = {
    Product: [
        { label: 'Live Copilot', href: '#features' },
        { label: 'Stealth Mode', href: '#stealth' },
        { label: 'Coding Assistant', href: '#coding' },
        { label: 'Mock Interviews', href: '#mock' },
        { label: 'MentorLink™', href: '#duo' },
        { label: 'Resume Builder', href: '#resume' },
    ],
    Company: [
        { label: 'About Us', href: '#' },
        { label: 'Careers', href: '#' },
        { label: 'Blog', href: '#' },
        { label: 'Press Kit', href: '#' },
        { label: 'Contact', href: '#' },
    ],
    Resources: [
        { label: 'Documentation', href: '#' },
        { label: 'API Reference', href: '#' },
        { label: 'Tutorials', href: '#' },
        { label: 'Community', href: '#' },
        { label: 'Status', href: '#' },
    ],
    Legal: [
        { label: 'Privacy Policy', href: '#' },
        { label: 'Terms of Service', href: '#' },
        { label: 'Cookie Policy', href: '#' },
        { label: 'GDPR', href: '#' },
        { label: 'Refund Policy', href: '#' },
    ],
}

const socials = [
    { icon: <Linkedin className="w-5 h-5" />, href: '#', label: 'LinkedIn' },
    { icon: <Twitter className="w-5 h-5" />, href: '#', label: 'Twitter' },
    { icon: <Youtube className="w-5 h-5" />, href: '#', label: 'YouTube' },
    { icon: <MessageCircle className="w-5 h-5" />, href: '#', label: 'Discord' },
    { icon: <Instagram className="w-5 h-5" />, href: '#', label: 'Instagram' },
]

export default function Footer() {
    return (
        <footer className="border-t border-white/[0.06] bg-bg-secondary/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
                    {/* Logo + Tagline */}
                    <div className="col-span-2">
                        <Link to="/" className="flex items-center gap-2.5 mb-4">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-lg font-heading font-bold">
                                Interview<span className="text-gradient">Genius</span> AI
                            </span>
                        </Link>
                        <p className="text-sm text-txt-secondary mb-6 max-w-xs">
                            Your Invisible AI. Your Unfair Advantage. Real-time interview coaching that's 100% undetectable.
                        </p>

                        {/* Newsletter */}
                        <div className="flex gap-2">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="flex-1 bg-bg-card border border-white/[0.08] rounded-lg px-4 py-2 text-sm text-txt-primary placeholder-txt-muted focus:outline-none focus:border-brand-cyan/50"
                            />
                            <button className="bg-gradient-to-r from-brand-cyan to-brand-purple text-white px-4 py-2 rounded-lg text-sm font-semibold hover:shadow-[0_0_20px_rgba(0,212,255,0.3)] transition-shadow cursor-pointer">
                                Subscribe
                            </button>
                        </div>
                    </div>

                    {/* Link Columns */}
                    {Object.entries(footerLinks).map(([title, links]) => (
                        <div key={title}>
                            <h4 className="font-heading font-semibold text-txt-primary text-sm mb-4">{title}</h4>
                            <ul className="space-y-2.5">
                                {links.map((link) => (
                                    <li key={link.label}>
                                        <a href={link.href} className="text-sm text-txt-secondary hover:text-brand-cyan transition-colors">
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom bar */}
                <div className="mt-12 pt-8 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-txt-muted">© 2025 InterviewGenius AI. All rights reserved.</p>
                    <div className="flex items-center gap-3">
                        {socials.map((social) => (
                            <a
                                key={social.label}
                                href={social.href}
                                className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-txt-secondary hover:text-brand-cyan hover:border-brand-cyan/30 transition-all"
                                aria-label={social.label}
                            >
                                {social.icon}
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    )
}
