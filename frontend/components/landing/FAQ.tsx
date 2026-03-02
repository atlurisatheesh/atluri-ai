"use client";

import { motion } from "framer-motion";
import Accordion from "../ui/Accordion";

const faqs = [
  { title: "Is the stealth mode really undetectable?", content: "Yes. Our PhantomVeil™ engine renders answers on a hardware-level overlay (DirectComposition on Windows, CALayer on macOS) that is invisible to getDisplayMedia, OBS, Zoom screen-share, and all proctoring software we've tested against — including ProctorU, Examity, and HonorLock." },
  { title: "Which video platforms are supported?", content: "Zoom, Google Meet, Microsoft Teams, Webex, BlueJeans, and any browser-based video platform. Our desktop app captures audio at the OS level, so it works regardless of the meeting tool." },
  { title: "How does the AI generate answers so fast?", content: "We use a streaming GPT-4o pipeline with sub-300ms first-token latency. Questions are detected via real-time Whisper transcription, and answers begin rendering before the full question is even finished." },
  { title: "What are company modes?", content: "Company modes are AI behavioral profiles that mimic the interview style, rubric, and culture of specific companies. For example, Amazon mode focuses on Leadership Principles, while Google mode emphasizes structured thinking and trade-off analysis." },
  { title: "Can I use this for live interviews or just practice?", content: "Both. Use mock-interview mode to practice with AI-generated questions, or enable stealth mode during a real interview for real-time assistance. The choice is yours." },
  { title: "Is my data private?", content: "Absolutely. Audio is processed in-memory and never stored. Transcripts are encrypted at rest with AES-256 and only accessible to your account. We do not train on your data." },
  { title: "What happens after the free plan?", content: "The free plan gives you 3 mock interviews per month with the basic AI engine. Upgrade to Pro for unlimited sessions, all 35+ company modes, stealth desktop app, and performance analytics." },
  { title: "Do I need to install software?", content: "The web app works in any modern browser for mock interviews. For stealth mode during real interviews, you'll download our lightweight desktop app (~35MB) for Windows or macOS." },
  { title: "Can I cancel anytime?", content: "Yes. All plans are month-to-month (or annual) with no lock-in. Cancel with one click from your Settings page and your access continues until the end of the billing period." },
  { title: "How is this different from ChatGPT?", content: "ChatGPT requires you to type questions and copy-paste answers. AtluriIn listens to the interviewer live, generates structured responses automatically, and renders them in an undetectable overlay — all hands-free in real time." },
];

export default function FAQ() {
  return (
    <section id="faq" className="section-padding bg-transparent">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <span className="text-brand-red text-sm font-semibold tracking-wider uppercase">FAQ</span>
          <h2 className="text-3xl md:text-4xl font-bold text-textPrimary mt-2 mb-4">Frequently Asked Questions</h2>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <Accordion items={faqs} />
        </motion.div>
      </div>
    </section>
  );
}
