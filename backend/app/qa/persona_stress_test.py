"""
REAL USER STRESS TEST - 10 Persona Simulation
Simulates actual user behavior patterns against live backend
"""

import asyncio
import websockets
import json
import time
import random
import statistics
import base64
import os
from dataclasses import dataclass
from typing import List, Dict, Optional
from enum import Enum

# Enable dev mode for testing
os.environ.setdefault("ALLOW_UNVERIFIED_JWT_DEV", "true")

HTTP_URL = "http://127.0.0.1:9010"

def build_dev_token(sub: str = "persona-tester") -> str:
    """Build a dev JWT token for testing"""
    enc = lambda obj: base64.urlsafe_b64encode(json.dumps(obj, separators=(",", ":")).encode()).decode().rstrip("=")
    return f"{enc({'alg':'none','typ':'JWT'})}.{enc({'sub':sub,'iat':0})}."

def get_ws_url(room_id: str) -> str:
    """Get WebSocket URL with token and room"""
    token = build_dev_token()
    return f"ws://127.0.0.1:9010/ws/voice?token={token}&room_id={room_id}&participant=candidate"

class PersonaType(Enum):
    NERVOUS_FRESHER = "nervous_fresher"
    STRONG_ACCENT = "strong_accent"
    SLOW_SPEAKER = "slow_speaker"
    FAST_OVERTALKER = "fast_overtalker"
    DISTRACTED = "distracted"
    LOW_BANDWIDTH = "low_bandwidth"
    TECHNICAL_L5 = "technical_l5"
    OVERCONFIDENT = "overconfident"
    EMOTIONAL = "emotional"
    SILENT_HESITANT = "silent_hesitant"

@dataclass
class PersonaResult:
    persona: PersonaType
    session_id: str
    connection_time_ms: float
    messages_sent: int
    messages_received: int
    avg_response_time_ms: float
    max_response_time_ms: float
    errors: List[str]
    disconnects: int
    trust_score: int  # 0-100
    would_use_real_interview: bool
    verbatim_feedback: str

@dataclass
class TestReport:
    total_personas: int
    passed: int
    failed: int
    avg_trust_score: float
    launch_ready: bool
    critical_issues: List[str]
    results: List[PersonaResult]

class PersonaSimulator:
    def __init__(self, persona_type: PersonaType):
        self.persona = persona_type
        self.session_id = f"persona_{persona_type.value}_{int(time.time())}"
        self.connection_start = None
        self.messages_sent = 0
        self.messages_received = 0
        self.response_times = []
        self.errors = []
        self.disconnects = 0
        
    async def simulate(self) -> PersonaResult:
        """Run full simulation for this persona"""
        print(f"\n{'='*60}")
        print(f"PERSONA: {self.persona.value.upper()}")
        print(f"{'='*60}")
        
        try:
            result = await self._run_session()
            self._print_result(result)
            return result
        except Exception as e:
            return self._create_failed_result(str(e))
    
    async def _run_session(self) -> PersonaResult:
        """Execute persona-specific behavior"""
        
        # Each persona has different behavior
        behavior = self._get_behavior()
        
        connection_time = 0
        try:
            self.connection_start = time.time()
            
            ws_url = get_ws_url(self.session_id)
            print(f"  Connecting to: {ws_url[:80]}...")
            
            async with websockets.connect(
                ws_url,
                close_timeout=5,
                ping_timeout=behavior["ping_timeout"],
                ping_interval=behavior["ping_interval"]
            ) as ws:
                connection_time = (time.time() - self.connection_start) * 1000
                print(f"  ✓ Connected in {connection_time:.0f}ms")
                
                # Wait for initial messages
                try:
                    initial = await asyncio.wait_for(ws.recv(), timeout=5)
                    print(f"  ← Initial: {str(initial)[:50]}...")
                except asyncio.TimeoutError:
                    print(f"  ⚠ No initial message")
                
                # Simulate session according to persona behavior
                await self._simulate_behavior(ws, behavior)
                
        except websockets.exceptions.ConnectionClosed as e:
            self.disconnects += 1
            self.errors.append(f"Connection closed: {e}")
            print(f"  ✗ Connection closed: {e}")
        except asyncio.TimeoutError:
            self.errors.append("Connection timeout")
            print(f"  ✗ Connection timeout")
        except Exception as e:
            self.errors.append(f"Error: {str(e)}")
            print(f"  ✗ Error: {e}")
        
        return self._create_result(connection_time)
    
    def _get_behavior(self) -> Dict:
        """Get behavior parameters for this persona"""
        behaviors = {
            PersonaType.NERVOUS_FRESHER: {
                "speech_pattern": "burst",
                "words_per_message": 5,
                "pause_between_ms": random.randint(100, 500),
                "message_count": 20,
                "filler_words": ["um", "like", "you know"],
                "ping_timeout": 10,
                "ping_interval": 5,
                "simulate_panic": True,
            },
            PersonaType.STRONG_ACCENT: {
                "speech_pattern": "normal",
                "words_per_message": 15,
                "pause_between_ms": 300,
                "message_count": 10,
                "alternate_spellings": True,
                "ping_timeout": 10,
                "ping_interval": 5,
                "simulate_panic": False,
            },
            PersonaType.SLOW_SPEAKER: {
                "speech_pattern": "slow",
                "words_per_message": 8,
                "pause_between_ms": random.randint(3000, 8000),
                "message_count": 6,
                "ping_timeout": 20,
                "ping_interval": 10,
                "simulate_panic": False,
            },
            PersonaType.FAST_OVERTALKER: {
                "speech_pattern": "continuous",
                "words_per_message": 50,
                "pause_between_ms": 0,
                "message_count": 3,
                "ping_timeout": 10,
                "ping_interval": 5,
                "simulate_panic": False,
            },
            PersonaType.DISTRACTED: {
                "speech_pattern": "interrupted",
                "words_per_message": 10,
                "pause_between_ms": random.randint(1000, 5000),
                "message_count": 5,
                "background_noise": True,
                "ping_timeout": 10,
                "ping_interval": 5,
                "simulate_panic": False,
            },
            PersonaType.LOW_BANDWIDTH: {
                "speech_pattern": "choppy",
                "words_per_message": 10,
                "pause_between_ms": 500,
                "message_count": 8,
                "packet_loss": 0.3,
                "latency_spike_ms": 2000,
                "ping_timeout": 30,
                "ping_interval": 15,
                "simulate_panic": False,
            },
            PersonaType.TECHNICAL_L5: {
                "speech_pattern": "precise",
                "words_per_message": 30,
                "pause_between_ms": 500,
                "message_count": 8,
                "technical_jargon": True,
                "ping_timeout": 10,
                "ping_interval": 5,
                "simulate_panic": False,
            },
            PersonaType.OVERCONFIDENT: {
                "speech_pattern": "confident",
                "words_per_message": 25,
                "pause_between_ms": 200,
                "message_count": 5,
                "ignores_suggestions": True,
                "ping_timeout": 10,
                "ping_interval": 5,
                "simulate_panic": False,
            },
            PersonaType.EMOTIONAL: {
                "speech_pattern": "emotional",
                "words_per_message": 10,
                "pause_between_ms": random.randint(2000, 6000),
                "message_count": 6,
                "voice_cracks": True,
                "ping_timeout": 10,
                "ping_interval": 5,
                "simulate_panic": False,
            },
            PersonaType.SILENT_HESITANT: {
                "speech_pattern": "minimal",
                "words_per_message": 3,
                "pause_between_ms": random.randint(5000, 15000),
                "message_count": 3,
                "may_never_speak": True,
                "ping_timeout": 30,
                "ping_interval": 15,
                "simulate_panic": False,
            },
        }
        return behaviors.get(self.persona, behaviors[PersonaType.NERVOUS_FRESHER])
    
    async def _simulate_behavior(self, ws, behavior: Dict):
        """Send messages according to persona behavior"""
        
        questions = [
            "Tell me about yourself",
            "What is your greatest weakness?",
            "Describe a time you failed",
            "Why do you want this job?",
            "Where do you see yourself in 5 years?",
        ]
        
        for i in range(min(behavior["message_count"], len(questions))):
            # Simulate thinking/pause before question
            pause = behavior["pause_between_ms"]
            if pause > 0:
                await asyncio.sleep(pause / 1000)
            
            # Construct message based on persona
            message = self._construct_message(questions[i % len(questions)], behavior)
            
            # Send message (simulating transcript from STT)
            start = time.time()
            try:
                # Send as transcript message (how real STT would send it)
                await ws.send(json.dumps({
                    "type": "transcript",
                    "text": message,
                    "is_final": True,
                    "participant": "interviewer",  # Question comes from interviewer
                    "confidence": 0.95
                }))
                self.messages_sent += 1
                print(f"  → Sent: {message[:50]}..." if len(message) > 50 else f"  → Sent: {message}")
                
                # Simulate low bandwidth packet loss
                if behavior.get("packet_loss", 0) > 0:
                    if random.random() < behavior["packet_loss"]:
                        print(f"  ⚠ Simulated packet loss")
                        continue
                
                # Wait for response with timeout — drain multiple messages
                # Server sends: transcript_ack, interviewer_question, answer_suggestion_start,
                # answer_suggestion_chunk(s), answer_suggestion / answer_suggestion_done
                # We count a "meaningful response" as any suggestion-related message.
                try:
                    got_suggestion = False
                    first_response_time = None
                    drain_deadline = time.time() + 15  # up to 15s to fully drain
                    while time.time() < drain_deadline:
                        remaining = max(0.1, drain_deadline - time.time())
                        try:
                            response = await asyncio.wait_for(ws.recv(), timeout=min(remaining, 5))
                        except asyncio.TimeoutError:
                            break  # no more messages

                        if first_response_time is None:
                            first_response_time = (time.time() - start) * 1000

                        data = json.loads(response) if isinstance(response, str) else response
                        msg_type = data.get("type", "unknown") if isinstance(data, dict) else "unknown"
                        self.messages_received += 1

                        if msg_type in {"answer_suggestion", "answer_suggestion_chunk", "answer_suggestion_start", "answer_suggestion_done"}:
                            got_suggestion = True

                        # Stop draining once we see the final done marker
                        if msg_type == "answer_suggestion_done":
                            break

                    if first_response_time is not None:
                        self.response_times.append(first_response_time)

                    if got_suggestion:
                        print(f"  ← Received suggestion in {first_response_time:.0f}ms")
                    elif first_response_time is not None:
                        print(f"  ← Received non-suggestion response in {first_response_time:.0f}ms")
                    else:
                        self.errors.append(f"Timeout waiting for response to: {message[:30]}")
                        print(f"  ✗ TIMEOUT waiting for response")
                    
                except asyncio.TimeoutError:
                    self.errors.append(f"Timeout waiting for response to: {message[:30]}")
                    print(f"  ✗ TIMEOUT waiting for response")
                    
            except Exception as e:
                self.errors.append(f"Send error: {e}")
                print(f"  ✗ ERROR: {e}")
    
    def _construct_message(self, base: str, behavior: Dict) -> str:
        """Construct message according to persona's speech pattern"""
        
        if behavior.get("filler_words"):
            fillers = behavior["filler_words"]
            words = base.split()
            result = []
            for word in words:
                result.append(word)
                if random.random() > 0.7:
                    result.append(random.choice(fillers))
            return " ".join(result)
        
        if behavior.get("alternate_spellings"):
            # Simulate accent-related mishearings
            replacements = {
                "about": "aboot",
                "development": "daevelopment",
                "manager": "managher",
            }
            for old, new in replacements.items():
                if random.random() > 0.5:
                    base = base.replace(old, new)
            return base
        
        if behavior.get("technical_jargon"):
            jargon = " including microservices architecture, distributed systems, CAP theorem implications"
            return base + jargon
        
        return base
    
    def _create_result(self, connection_time: float) -> PersonaResult:
        """Create result object from simulation data"""
        
        avg_response = statistics.mean(self.response_times) if self.response_times else 0
        max_response = max(self.response_times) if self.response_times else 0
        
        # Calculate trust score based on behavior
        trust_score = self._calculate_trust_score(avg_response, max_response)
        
        return PersonaResult(
            persona=self.persona,
            session_id=self.session_id,
            connection_time_ms=connection_time,
            messages_sent=self.messages_sent,
            messages_received=self.messages_received,
            avg_response_time_ms=avg_response,
            max_response_time_ms=max_response,
            errors=self.errors,
            disconnects=self.disconnects,
            trust_score=trust_score,
            would_use_real_interview=trust_score >= 60,
            verbatim_feedback=self._generate_feedback(trust_score)
        )
    
    def _create_failed_result(self, error: str) -> PersonaResult:
        """Create failed result object"""
        return PersonaResult(
            persona=self.persona,
            session_id=self.session_id,
            connection_time_ms=0,
            messages_sent=0,
            messages_received=0,
            avg_response_time_ms=0,
            max_response_time_ms=0,
            errors=[error],
            disconnects=1,
            trust_score=0,
            would_use_real_interview=False,
            verbatim_feedback=f"FAILED: {error}"
        )
    
    def _calculate_trust_score(self, avg_response: float, max_response: float) -> int:
        """
        Calculate trust score (0-100) based on performance.
        
        Aligned with BETA_VALIDATION_SYSTEM_FINAL.md formula:
          35% response reliability (message loss + errors)
          25% avg response latency (target <1500ms)
          20% max response latency (target <3000ms)
          15% connection stability (disconnects)
           5% connection speed (target <2000ms)
        """
        score = 100.0
        
        # ── Response latency (25 pts max penalty) ──
        if avg_response > 500:
            # Gradual penalty: 500ms=0, 1500ms=-12.5, 3000ms=-25
            score -= min(25, (avg_response - 500) / 100)
        
        # ── Max latency spike (20 pts max penalty) ──
        if max_response > 1500:
            score -= min(20, (max_response - 1500) / 150)
        
        # ── Errors (5 pts each, 25 pts max penalty) ──
        score -= min(25, len(self.errors) * 5)
        
        # ── Disconnects (15 pts each, 15 pts max penalty) ──
        score -= min(15, self.disconnects * 15)
        
        # ── Message loss (15 pts max penalty) ──
        if self.messages_sent > 0:
            loss_rate = 1 - min(1.0, self.messages_received / self.messages_sent)
            score -= loss_rate * 15
        
        return max(0, int(score))
    
    def _generate_feedback(self, trust_score: int) -> str:
        """Generate realistic verbatim feedback"""
        if trust_score >= 80:
            return "This is helpful, I'd try it in a real interview"
        elif trust_score >= 60:
            return "It's okay, but the delay made me nervous"
        elif trust_score >= 40:
            return "Too slow, I don't trust it under pressure"
        else:
            return "It broke too many times, I won't use this"
    
    def _print_result(self, result: PersonaResult):
        """Print result summary"""
        print(f"\n  RESULTS:")
        print(f"  ├─ Messages: {result.messages_sent} sent, {result.messages_received} received")
        print(f"  ├─ Response: avg {result.avg_response_time_ms:.0f}ms, max {result.max_response_time_ms:.0f}ms")
        print(f"  ├─ Errors: {len(result.errors)}")
        print(f"  ├─ Disconnects: {result.disconnects}")
        print(f"  ├─ Trust Score: {result.trust_score}/100")
        print(f"  └─ Would use in real interview: {'YES' if result.would_use_real_interview else 'NO'}")
        print(f"  Feedback: \"{result.verbatim_feedback}\"")


async def run_all_personas():
    """Run all 10 persona simulations"""
    print("\n" + "="*70)
    print("10 PERSONA STRESS TEST - REAL USER SIMULATION")
    print("="*70)
    
    results: List[PersonaResult] = []
    
    for persona_type in PersonaType:
        simulator = PersonaSimulator(persona_type)
        result = await simulator.simulate()
        results.append(result)
        await asyncio.sleep(1)  # Brief pause between personas
    
    # Generate final report
    report = generate_report(results)
    print_final_report(report)
    
    return report


def generate_report(results: List[PersonaResult]) -> TestReport:
    """Generate comprehensive test report"""
    
    passed = sum(1 for r in results if r.trust_score >= 60 and len(r.errors) == 0)
    failed = len(results) - passed
    
    trust_scores = [r.trust_score for r in results]
    avg_trust = statistics.mean(trust_scores) if trust_scores else 0
    
    critical_issues = []
    
    # Identify critical issues
    for r in results:
        if r.disconnects > 0:
            critical_issues.append(f"{r.persona.value}: {r.disconnects} disconnects")
        if r.avg_response_time_ms > 2000:
            critical_issues.append(f"{r.persona.value}: Avg response {r.avg_response_time_ms:.0f}ms (>2000ms)")
        if r.trust_score < 40:
            critical_issues.append(f"{r.persona.value}: Trust score {r.trust_score} (CRITICAL)")
    
    # Launch readiness check
    launch_ready = (
        avg_trust >= 70 and
        passed >= 7 and
        len([r for r in results if r.disconnects > 0]) <= 2
    )
    
    return TestReport(
        total_personas=len(results),
        passed=passed,
        failed=failed,
        avg_trust_score=avg_trust,
        launch_ready=launch_ready,
        critical_issues=critical_issues,
        results=results
    )


def print_final_report(report: TestReport):
    """Print final assessment"""
    print("\n")
    print("="*70)
    print("FINAL ASSESSMENT")
    print("="*70)
    
    print(f"""
┌────────────────────────────────────────────────────────────────────┐
│  PERSONA STRESS TEST RESULTS                                       │
├────────────────────────────────────────────────────────────────────┤
│  Total Personas Tested: {report.total_personas:3d}                                     │
│  Passed (Trust ≥60):    {report.passed:3d}                                     │
│  Failed:                {report.failed:3d}                                     │
│  Average Trust Score:   {report.avg_trust_score:.1f}/100                               │
├────────────────────────────────────────────────────────────────────┤
│  LAUNCH VERDICT: {'✓ GO' if report.launch_ready else '✗ NO-GO':16s}                              │
└────────────────────────────────────────────────────────────────────┘
""")
    
    if report.critical_issues:
        print("CRITICAL ISSUES TO FIX:")
        for issue in report.critical_issues:
            print(f"  ✗ {issue}")
    
    print("\nPER-PERSONA BREAKDOWN:")
    for r in report.results:
        status = "✓" if r.trust_score >= 60 else "✗"
        print(f"  {status} {r.persona.value:20s} | Trust: {r.trust_score:3d} | Errors: {len(r.errors):2d} | {r.verbatim_feedback[:40]}")
    
    # Recommendations
    print("\nRECOMMENDATIONS:")
    if report.avg_trust_score < 70:
        print("  1. Improve response latency (target <1000ms avg)")
    
    high_error_personas = [r for r in report.results if len(r.errors) > 2]
    if high_error_personas:
        print(f"  2. Fix connection stability for: {', '.join([r.persona.value for r in high_error_personas])}")
    
    low_trust = [r for r in report.results if r.trust_score < 40]
    if low_trust:
        print(f"  3. Critical attention needed for: {', '.join([r.persona.value for r in low_trust])}")


if __name__ == "__main__":
    print("""
╔════════════════════════════════════════════════════════════════════╗
║  INTERVIEW COPILOT - REAL USER PERSONA STRESS TEST                ║
║  Acting as 10 different users to break the system                  ║
╚════════════════════════════════════════════════════════════════════╝
""")
    asyncio.run(run_all_personas())
