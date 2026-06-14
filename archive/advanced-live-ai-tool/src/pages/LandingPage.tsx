import Navbar from '../components/landing/Navbar'
import Hero from '../components/landing/Hero'
import Integrations from '../components/landing/Integrations'
import Features from '../components/landing/Features'
import HowItWorks from '../components/landing/HowItWorks'
import StealthShowcase from '../components/landing/StealthShowcase'
import DemoVideos from '../components/landing/DemoVideos'
import FeatureDeepDive from '../components/landing/FeatureDeepDive'
import Testimonials from '../components/landing/Testimonials'
import Pricing from '../components/landing/Pricing'
import ResumeCallout from '../components/landing/ResumeCallout'
import CreatorSection from '../components/landing/CreatorSection'
import FAQ from '../components/landing/FAQ'
import Footer from '../components/landing/Footer'

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-bg-primary">
            <Navbar />
            <Hero />
            <Integrations />
            <Features />
            <HowItWorks />
            <StealthShowcase />
            <DemoVideos />
            <FeatureDeepDive />
            <Testimonials />
            <Pricing />
            <ResumeCallout />
            <CreatorSection />
            <FAQ />
            <Footer />
        </div>
    )
}
