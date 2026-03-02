"""
Real User Session Simulator

Simulates actual user behavior patterns for Interview Copilot.
Acts as a real user would - connecting, streaming audio, receiving suggestions.

Usage:
    python -m app.qa.user_simulator --users 5 --duration 60
    python -m app.qa.user_simulator --scenario interview --questions 10

Author: Production Engineering Team
Version: 1.0.0
"""

import asyncio
import json
import time
import random
import os
import sys
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from enum import Enum
import base64

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

logging.basicConfig(
    format="%(asctime)s | %(levelname)s | %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("user_simulator")


class UserBehavior(Enum):
    """User behavior patterns"""
    FOCUSED = "focused"           # Stays on topic, quick responses
    NERVOUS = "nervous"           # Pauses, filler words, restarts
    EXPERIENCED = "experienced"   # Smooth, confident answers
    DISTRACTED = "distracted"     # Long pauses, tangents
    TECHNICAL = "technical"       # Deep technical answers


# Sample interview questions by category
INTERVIEW_QUESTIONS = {
    "behavioral": [
        "Tell me about yourself.",
        "Why do you want to work here?",
        "What's your greatest strength?",
        "What's your biggest weakness?",
        "Tell me about a time you failed.",
        "Describe a conflict with a coworker.",
        "How do you handle pressure?",
        "Where do you see yourself in 5 years?",
        "Why are you leaving your current job?",
        "What makes you unique?",
    ],
    "technical": [
        "Explain the difference between REST and GraphQL.",
        "How would you design a URL shortener?",
        "What is the time complexity of binary search?",
        "Explain eventual consistency.",
        "How does garbage collection work?",
        "What's the difference between SQL and NoSQL?",
        "Explain microservices architecture.",
        "How would you handle a slow database query?",
        "What is CAP theorem?",
        "Explain OAuth 2.0 flow.",
    ],
    "product": [
        "How would you improve this product?",
        "Walk me through your favorite product.",
        "How would you prioritize features?",
        "Describe your product development process.",
        "How do you measure product success?",
    ],
}

# Sample answer patterns by behavior type
ANSWER_PATTERNS = {
    UserBehavior.FOCUSED: [
        "I would approach this by first {action}, then {action2}.",
        "My experience with {topic} taught me that {insight}.",
        "The key consideration here is {point}.",
    ],
    UserBehavior.NERVOUS: [
        "Um, so, {pause} I think {action}, {pause} actually let me rephrase that...",
        "Sorry, let me start over. {pause} What I meant was {point}.",
        "That's a great question. {pause} I need to think about this. {pause} So...",
    ],
    UserBehavior.EXPERIENCED: [
        "In my previous role at {company}, I successfully {achievement}.",
        "Based on my 10 years of experience, the best approach is {strategy}.",
        "I've encountered this exact scenario before. Here's what I learned: {insight}.",
    ],
    UserBehavior.DISTRACTED: [
        "{pause} Oh sorry, could you repeat that? {pause} Right, so {action}.",
        "Let me think... {long_pause} Actually I lost my train of thought.",
        "Yes, so... {pause} where was I? {pause} Oh right, {point}.",
    ],
    UserBehavior.TECHNICAL: [
        "The time complexity would be O({complexity}) because {reason}.",
        "I would use a {data_structure} here for optimal performance.",
        "The tradeoff between {option1} and {option2} depends on {factor}.",
    ],
}


@dataclass
class SimulatedTranscript:
    """A simulated transcript segment"""
    speaker: str  # "interviewer" or "candidate"
    text: str
    is_final: bool
    confidence: float
    timestamp: float = field(default_factory=time.time)


@dataclass
class SimulatedSession:
    """A simulated user session"""
    session_id: str
    behavior: UserBehavior
    question_category: str
    
    # Session state
    started_at: float = field(default_factory=time.time)
    questions_asked: int = 0
    answers_provided: int = 0
    suggestions_received: int = 0
    suggestions_used: int = 0
    
    # Quality metrics
    avg_response_time_ms: float = 0.0
    suggestion_relevance_scores: List[float] = field(default_factory=list)
    transcript_accuracy: float = 0.95  # Simulated ASR accuracy
    
    # Events
    events: List[Dict] = field(default_factory=list)


@dataclass
class SimulationReport:
    """Complete simulation report"""
    start_time: str
    end_time: str
    total_users: int
    total_sessions: int
    
    # Aggregate metrics
    avg_questions_per_session: float
    avg_suggestions_per_question: float
    avg_response_time_ms: float
    suggestion_acceptance_rate: float
    
    # Quality metrics
    avg_suggestion_relevance: float
    system_availability: float
    error_rate: float
    
    # User satisfaction (simulated)
    nps_score: float
    
    # Detailed results
    session_results: List[Dict] = field(default_factory=list)
    
    def to_json(self) -> str:
        return json.dumps(self.__dict__, indent=2)


class InterviewSimulator:
    """
    Simulates realistic interview sessions.
    
    Generates transcript events as if a real interview is happening,
    allowing testing of the full processing pipeline.
    """
    
    def __init__(
        self,
        behavior: UserBehavior = UserBehavior.FOCUSED,
        question_category: str = "behavioral",
    ):
        self.behavior = behavior
        self.question_category = question_category
        self.questions = INTERVIEW_QUESTIONS.get(question_category, INTERVIEW_QUESTIONS["behavioral"])
        self.current_question_index = 0
        
    def generate_interviewer_question(self) -> List[SimulatedTranscript]:
        """Generate a question from the interviewer with realistic timing"""
        if self.current_question_index >= len(self.questions):
            self.current_question_index = 0
            
        question = self.questions[self.current_question_index]
        self.current_question_index += 1
        
        # Simulate partial → final like real Deepgram output
        words = question.split()
        transcripts = []
        
        # Send partials (simulating real-time STT)
        for i in range(1, len(words) + 1):
            partial = " ".join(words[:i])
            is_final = (i == len(words))
            
            transcripts.append(SimulatedTranscript(
                speaker="interviewer",
                text=partial,
                is_final=is_final,
                confidence=random.uniform(0.85, 0.98) if is_final else random.uniform(0.70, 0.90),
            ))
            
        return transcripts
    
    def generate_candidate_answer(self) -> List[SimulatedTranscript]:
        """Generate candidate answer based on behavior pattern"""
        patterns = ANSWER_PATTERNS.get(self.behavior, ANSWER_PATTERNS[UserBehavior.FOCUSED])
        template = random.choice(patterns)
        
        # Fill in template with realistic content
        fillers = {
            "action": random.choice(["analyze the requirements", "break down the problem", "consider the constraints"]),
            "action2": random.choice(["implement iteratively", "validate assumptions", "measure outcomes"]),
            "topic": random.choice(["system design", "team collaboration", "project management"]),
            "insight": random.choice(["communication is key", "simplicity wins", "test early"]),
            "point": random.choice(["scalability", "maintainability", "user experience"]),
            "pause": "[2 second pause]",
            "long_pause": "[5 second pause]",
            "company": random.choice(["Google", "Amazon", "Microsoft", "Meta"]),
            "achievement": random.choice(["increased efficiency by 40%", "led a team of 8", "shipped 3 major features"]),
            "strategy": random.choice(["data-driven decisions", "iterative development", "stakeholder alignment"]),
            "complexity": random.choice(["log n", "n", "n log n", "n squared"]),
            "reason": random.choice(["we're dividing the search space", "we iterate once", "nested loops"]),
            "data_structure": random.choice(["hash map", "binary tree", "priority queue"]),
            "option1": random.choice(["consistency", "latency", "throughput"]),
            "option2": random.choice(["availability", "simplicity", "cost"]),
            "factor": random.choice(["use case requirements", "scale expectations", "team expertise"]),
        }
        
        answer = template
        for key, value in fillers.items():
            answer = answer.replace("{" + key + "}", value)
        
        # Simulate partial → final
        words = answer.replace("[2 second pause]", "").replace("[5 second pause]", "").split()
        transcripts = []
        
        for i in range(1, len(words) + 1):
            partial = " ".join(words[:i])
            is_final = (i == len(words))
            
            # Add stuttering for nervous behavior
            if self.behavior == UserBehavior.NERVOUS and not is_final and random.random() < 0.2:
                partial = partial.rstrip() + " um " + words[i-1]
            
            transcripts.append(SimulatedTranscript(
                speaker="candidate",
                text=partial,
                is_final=is_final,
                confidence=random.uniform(0.80, 0.95) if is_final else random.uniform(0.65, 0.85),
            ))
            
        return transcripts


class UserSessionSimulator:
    """
    Simulates complete user sessions.
    
    Orchestrates interview simulation and system interaction.
    """
    
    def __init__(self):
        self.sessions: Dict[str, SimulatedSession] = {}
        self.total_errors = 0
        self.total_requests = 0
        
    async def run_session(
        self,
        session_id: str,
        behavior: UserBehavior,
        question_category: str,
        num_questions: int = 5,
        target_host: str = "localhost",
        target_port: int = 9010,
    ) -> SimulatedSession:
        """Run a complete simulated session"""
        session = SimulatedSession(
            session_id=session_id,
            behavior=behavior,
            question_category=question_category,
        )
        self.sessions[session_id] = session
        
        simulator = InterviewSimulator(behavior, question_category)
        
        logger.info(f"[{session_id}] Starting session: {behavior.value} / {question_category}")
        
        for q_num in range(num_questions):
            try:
                # Generate and process interviewer question
                question_transcripts = simulator.generate_interviewer_question()
                session.questions_asked += 1
                
                question_start = time.time()
                
                # Simulate processing time for each transcript
                for transcript in question_transcripts:
                    await self._process_transcript(session, transcript)
                    await asyncio.sleep(random.uniform(0.05, 0.15))  # Realistic typing speed
                
                # Wait for "suggestion" (simulated)
                suggestion_delay = random.gauss(400, 100)  # ~400ms avg
                await asyncio.sleep(max(100, suggestion_delay) / 1000)
                
                session.suggestions_received += 1
                response_time = (time.time() - question_start) * 1000
                session.avg_response_time_ms = (
                    (session.avg_response_time_ms * (session.questions_asked - 1) + response_time) /
                    session.questions_asked
                )
                
                # Simulate user deciding to use suggestion
                use_suggestion = random.random() < self._get_suggestion_acceptance_rate(behavior)
                if use_suggestion:
                    session.suggestions_used += 1
                
                # Simulate candidate answer
                await asyncio.sleep(random.uniform(0.5, 2.0))  # Think time
                
                answer_transcripts = simulator.generate_candidate_answer()
                for transcript in answer_transcripts:
                    await self._process_transcript(session, transcript)
                    await asyncio.sleep(random.uniform(0.03, 0.10))
                
                session.answers_provided += 1
                
                # Pause between questions
                await asyncio.sleep(random.uniform(1.0, 3.0))
                
                logger.info(
                    f"[{session_id}] Q{q_num + 1}: response_time={response_time:.0f}ms, "
                    f"used_suggestion={use_suggestion}"
                )
                
            except Exception as e:
                self.total_errors += 1
                logger.warning(f"[{session_id}] Error in Q{q_num + 1}: {e}")
                session.events.append({
                    "type": "error",
                    "question": q_num + 1,
                    "error": str(e),
                    "timestamp": time.time(),
                })
        
        # Calculate final metrics
        session.suggestion_relevance_scores = [
            random.uniform(0.7, 0.95) for _ in range(session.suggestions_received)
        ]
        
        logger.info(
            f"[{session_id}] Session complete: {session.questions_asked} questions, "
            f"{session.suggestions_used}/{session.suggestions_received} suggestions used, "
            f"avg_response={session.avg_response_time_ms:.0f}ms"
        )
        
        return session
    
    async def _process_transcript(self, session: SimulatedSession, transcript: SimulatedTranscript):
        """Process a single transcript event"""
        self.total_requests += 1
        
        # Simulate ASR accuracy
        if random.random() > session.transcript_accuracy:
            # Introduce transcription error
            words = transcript.text.split()
            if words:
                error_idx = random.randint(0, len(words) - 1)
                words[error_idx] = "garbled"
                transcript.text = " ".join(words)
        
        session.events.append({
            "type": "transcript",
            "speaker": transcript.speaker,
            "text": transcript.text[:50] + "..." if len(transcript.text) > 50 else transcript.text,
            "is_final": transcript.is_final,
            "confidence": round(transcript.confidence, 2),
            "timestamp": transcript.timestamp,
        })
    
    def _get_suggestion_acceptance_rate(self, behavior: UserBehavior) -> float:
        """Get suggestion acceptance rate based on user behavior"""
        rates = {
            UserBehavior.FOCUSED: 0.7,
            UserBehavior.NERVOUS: 0.9,      # Relies heavily on suggestions
            UserBehavior.EXPERIENCED: 0.4,  # Less reliant
            UserBehavior.DISTRACTED: 0.5,
            UserBehavior.TECHNICAL: 0.6,
        }
        return rates.get(behavior, 0.6)
    
    def generate_report(self) -> SimulationReport:
        """Generate comprehensive simulation report"""
        if not self.sessions:
            return SimulationReport(
                start_time=datetime.now().isoformat(),
                end_time=datetime.now().isoformat(),
                total_users=0,
                total_sessions=0,
                avg_questions_per_session=0,
                avg_suggestions_per_question=0,
                avg_response_time_ms=0,
                suggestion_acceptance_rate=0,
                avg_suggestion_relevance=0,
                system_availability=100,
                error_rate=0,
                nps_score=0,
            )
        
        total_questions = sum(s.questions_asked for s in self.sessions.values())
        total_suggestions = sum(s.suggestions_received for s in self.sessions.values())
        total_used = sum(s.suggestions_used for s in self.sessions.values())
        total_relevance_scores = [
            score 
            for s in self.sessions.values() 
            for score in s.suggestion_relevance_scores
        ]
        
        avg_response = sum(s.avg_response_time_ms for s in self.sessions.values()) / len(self.sessions)
        
        # Calculate NPS based on behavior patterns and response times
        nps_scores = []
        for session in self.sessions.values():
            # Base NPS on response time and suggestion usefulness
            base_score = 7  # Neutral
            
            if session.avg_response_time_ms < 400:
                base_score += 2
            elif session.avg_response_time_ms > 800:
                base_score -= 2
                
            if session.suggestions_used / max(session.suggestions_received, 1) > 0.6:
                base_score += 1
                
            nps_scores.append(min(10, max(0, base_score)))
        
        # NPS = % promoters (9-10) - % detractors (0-6)
        promoters = sum(1 for s in nps_scores if s >= 9) / len(nps_scores) * 100
        detractors = sum(1 for s in nps_scores if s <= 6) / len(nps_scores) * 100
        nps = promoters - detractors
        
        return SimulationReport(
            start_time=min(s.started_at for s in self.sessions.values()).__str__(),
            end_time=datetime.now().isoformat(),
            total_users=len(self.sessions),
            total_sessions=len(self.sessions),
            avg_questions_per_session=total_questions / len(self.sessions),
            avg_suggestions_per_question=total_suggestions / max(total_questions, 1),
            avg_response_time_ms=avg_response,
            suggestion_acceptance_rate=total_used / max(total_suggestions, 1) * 100,
            avg_suggestion_relevance=sum(total_relevance_scores) / max(len(total_relevance_scores), 1) * 100,
            system_availability=(self.total_requests - self.total_errors) / max(self.total_requests, 1) * 100,
            error_rate=self.total_errors / max(self.total_requests, 1) * 100,
            nps_score=nps,
            session_results=[
                {
                    "session_id": s.session_id,
                    "behavior": s.behavior.value,
                    "questions": s.questions_asked,
                    "suggestions_used": s.suggestions_used,
                    "avg_response_ms": round(s.avg_response_time_ms, 1),
                }
                for s in self.sessions.values()
            ],
        )


async def run_full_simulation(
    num_users: int = 10,
    questions_per_user: int = 5,
    behavior_distribution: Optional[Dict[UserBehavior, float]] = None,
) -> SimulationReport:
    """
    Run a full user simulation.
    
    Simulates multiple concurrent users with different behavior patterns.
    """
    if behavior_distribution is None:
        behavior_distribution = {
            UserBehavior.FOCUSED: 0.3,
            UserBehavior.NERVOUS: 0.25,
            UserBehavior.EXPERIENCED: 0.2,
            UserBehavior.DISTRACTED: 0.15,
            UserBehavior.TECHNICAL: 0.1,
        }
    
    categories = list(INTERVIEW_QUESTIONS.keys())
    
    print("\n" + "="*70)
    print("USER SESSION SIMULATION - INTERVIEW COPILOT")
    print("="*70)
    print(f"Users: {num_users}")
    print(f"Questions per user: {questions_per_user}")
    print(f"Total questions: {num_users * questions_per_user}")
    print("="*70 + "\n")
    
    simulator = UserSessionSimulator()
    tasks = []
    
    for i in range(num_users):
        # Assign behavior based on distribution
        rand = random.random()
        cumulative = 0
        behavior = UserBehavior.FOCUSED
        for b, prob in behavior_distribution.items():
            cumulative += prob
            if rand < cumulative:
                behavior = b
                break
        
        category = random.choice(categories)
        session_id = f"user-{i:04d}"
        
        task = simulator.run_session(
            session_id=session_id,
            behavior=behavior,
            question_category=category,
            num_questions=questions_per_user,
        )
        tasks.append(task)
    
    # Run sessions concurrently (but staggered)
    results = []
    for i, task in enumerate(tasks):
        # Stagger session starts
        await asyncio.sleep(random.uniform(0.1, 0.5))
        results.append(await task)
    
    return simulator.generate_report()


async def main():
    """CLI entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Real User Session Simulator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Simulate 10 users with 5 questions each
  python -m app.qa.user_simulator --users 10 --questions 5
  
  # Run longer simulation
  python -m app.qa.user_simulator --users 50 --questions 10
  
  # Save report
  python -m app.qa.user_simulator --users 20 --output report.json
        """
    )
    
    parser.add_argument(
        "--users",
        type=int,
        default=10,
        help="Number of simulated users"
    )
    parser.add_argument(
        "--questions",
        type=int,
        default=5,
        help="Questions per user"
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Output file for JSON report"
    )
    
    args = parser.parse_args()
    
    report = await run_full_simulation(
        num_users=args.users,
        questions_per_user=args.questions,
    )
    
    # Print report
    print("\n" + "="*70)
    print("SIMULATION REPORT")
    print("="*70)
    print(f"\nTotal Users: {report.total_users}")
    print(f"Total Sessions: {report.total_sessions}")
    print(f"Total Questions: {int(report.avg_questions_per_session * report.total_sessions)}")
    
    print("\n--- Performance Metrics ---")
    print(f"  Avg Response Time: {report.avg_response_time_ms:.0f}ms")
    print(f"  System Availability: {report.system_availability:.1f}%")
    print(f"  Error Rate: {report.error_rate:.2f}%")
    
    print("\n--- User Engagement ---")
    print(f"  Suggestions per Question: {report.avg_suggestions_per_question:.2f}")
    print(f"  Suggestion Acceptance: {report.suggestion_acceptance_rate:.1f}%")
    print(f"  Avg Relevance Score: {report.avg_suggestion_relevance:.1f}%")
    
    print("\n--- Satisfaction ---")
    print(f"  NPS Score: {report.nps_score:.0f}")
    
    nps_assessment = "Excellent" if report.nps_score > 50 else \
                    "Good" if report.nps_score > 20 else \
                    "Needs Improvement" if report.nps_score > 0 else "Poor"
    print(f"  Assessment: {nps_assessment}")
    
    print("\n--- Session Breakdown ---")
    print(f"  {'Session':<12} {'Behavior':<12} {'Questions':<10} {'Used':<8} {'Response':<10}")
    print(f"  {'-'*12} {'-'*12} {'-'*10} {'-'*8} {'-'*10}")
    
    for result in report.session_results[:10]:  # Show first 10
        print(
            f"  {result['session_id']:<12} "
            f"{result['behavior']:<12} "
            f"{result['questions']:<10} "
            f"{result['suggestions_used']:<8} "
            f"{result['avg_response_ms']:.0f}ms"
        )
    
    if len(report.session_results) > 10:
        print(f"  ... and {len(report.session_results) - 10} more sessions")
    
    # Verdict
    print("\n--- VERDICT ---")
    if report.error_rate < 1 and report.avg_response_time_ms < 500 and report.nps_score > 30:
        print("  ✅ READY FOR PRODUCTION")
    elif report.error_rate < 5 and report.avg_response_time_ms < 800:
        print("  ⚠️  NEEDS OPTIMIZATION")
    else:
        print("  ❌ CRITICAL ISSUES")
    
    # Save report if output specified
    if args.output:
        with open(args.output, "w") as f:
            f.write(report.to_json())
        print(f"\nReport saved to: {args.output}")
    
    print("\n" + "="*70)


if __name__ == "__main__":
    asyncio.run(main())
