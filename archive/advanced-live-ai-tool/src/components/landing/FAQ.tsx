import { motion } from 'framer-motion'
import Accordion from '../ui/Accordion'

const faqItems = [
    {
        title: 'How does the AI hear my interview?',
        content: 'InterviewGenius captures audio through your browser\'s WebRTC API. It can listen to your microphone (for phone screens) or system audio (for Zoom/Teams/Meet calls). The audio is processed in real-time through OpenAI Whisper for transcription, then analyzed by GPT-4o to generate contextual answers.'
    },
    {
        title: 'Is it really undetectable?',
        content: 'Yes. Our overlay renders on a separate browser compositor layer that screen capture software cannot access. It\'s invisible to Zoom, Teams, Google Meet, and all major proctoring tools including Honorlock, ProctorU, and Respondus. We also include a "Test Invisibility" feature so you can verify before any interview.'
    },
    {
        title: 'Does it work for phone screens?',
        content: 'Absolutely. For phone screens, simply enable microphone capture. The AI will transcribe the interviewer\'s questions through your phone\'s speaker and provide answers on your screen in real-time.'
    },
    {
        title: 'What platforms are supported?',
        content: 'InterviewGenius works with all major interview platforms: Zoom, Google Meet, Microsoft Teams, Webex, Amazon Chime, HackerRank, LeetCode, CoderPad, Karat, Interviewing.io, and more. If it runs in a browser or has audio output, we support it.'
    },
    {
        title: 'Can the interviewer see the overlay?',
        content: 'No. The overlay is completely invisible during screen sharing. It operates on a rendering layer that screen capture APIs cannot detect. You can verify this anytime using our built-in "Capture Preview" mode.'
    },
    {
        title: 'How accurate is the transcription?',
        content: 'We use OpenAI Whisper, the industry\'s most accurate speech-to-text model. Accuracy exceeds 95% for clear English speech. We also support accent optimization for Indian English, British English, American English, and 20+ other languages.'
    },
    {
        title: 'Can I use my own resume for personalized answers?',
        content: 'Yes! Upload your resume and job description, and our RAG (Retrieval-Augmented Generation) system will use them as context for every AI response. Your answers will reference your specific experience, skills, and achievements.'
    },
    {
        title: 'What happens if I run out of credits?',
        content: 'You\'ll receive warnings at 20% remaining. When credits are exhausted, you can purchase additional credit packs (which never expire) or upgrade your plan. Free tier users always have access to 10 basic AI responses per day.'
    },
    {
        title: 'Is there a money-back guarantee?',
        content: 'Yes. We offer a full 30-day money-back guarantee on all paid plans. If you\'re not satisfied for any reason, contact us within 30 days for a complete, no-questions-asked refund.'
    },
    {
        title: 'How is MentorLink™ different from NeuralWhisper™?',
        content: 'NeuralWhisper™ is fully automated — it listens, transcribes, and responds using AI. MentorLink™ connects you with a real human mentor (a friend, colleague, or hired FAANG engineer) who sees your screen and sends live hints. Use both simultaneously for maximum support.'
    },
]

export default function FAQ() {
    return (
        <section className="section-padding" id="faq">
            <div className="max-w-3xl mx-auto">
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
                        Frequently Asked <span className="text-gradient">Questions</span>
                    </h2>
                    <p className="text-txt-secondary">Everything you need to know about InterviewGenius AI.</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <Accordion items={faqItems} />
                </motion.div>
            </div>
        </section>
    )
}
