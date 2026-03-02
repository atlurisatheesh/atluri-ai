"""
Beta Telemetry API

Receives session telemetry and survey responses from beta users.
Stores data for analysis and go/no-go decision.

Endpoints:
  POST /api/v1/telemetry/session - Store session metrics
  POST /api/v1/telemetry/survey - Store survey response
  GET /api/v1/telemetry/report - Generate beta report
"""

import json
import os
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/telemetry", tags=["telemetry"])

# Data directory
DATA_DIR = Path(__file__).parent.parent.parent / "data" / "beta_telemetry"
DATA_DIR.mkdir(parents=True, exist_ok=True)


# ============ Request Models ============

class SessionTelemetry(BaseModel):
    sessionId: str
    userId: str
    startTime: int
    endTime: int
    durationSec: float
    
    browser: str
    screenWidth: int
    connectionType: str
    
    suggestionsShown: int
    suggestionsClicked: int
    suggestionFollowRate: float
    avgSuggestionLatencyMs: float
    p95SuggestionLatencyMs: float
    
    userPausedForSuggestion: int
    userIgnoredSuggestion: int
    sessionCompleted: bool
    
    errorCount: int
    wsReconnectCount: int
    audioGapCount: int
    freezeCount: int
    
    events: List[Dict[str, Any]]


class SurveyResponse(BaseModel):
    sessionId: str
    userId: str
    timestamp: int
    
    freezeExperience: str
    suggestionQuality: str
    confidenceImpact: str
    wouldUseInRealInterview: str
    improvementSuggestion: Optional[str] = ""


class IssueReport(BaseModel):
    sessionId: str
    userId: str
    timestamp: int
    issueType: str  # freeze, wrong_suggestion, audio_issue, other
    description: Optional[str] = ""
    browserInfo: str
    recentEvents: Optional[List[Dict[str, Any]]] = []


# ============ Endpoints ============

@router.post("/session")
async def store_session_telemetry(telemetry: SessionTelemetry):
    """Store session telemetry from browser"""
    try:
        user_dir = DATA_DIR / "sessions" / telemetry.userId
        user_dir.mkdir(parents=True, exist_ok=True)
        
        filename = f"session_{telemetry.sessionId}.json"
        filepath = user_dir / filename
        
        with open(filepath, "w") as f:
            json.dump(telemetry.dict(), f, indent=2)
        
        logger.info(
            "[BETA] Session stored: user=%s session=%s duration=%.0fs follow_rate=%.1f%%",
            telemetry.userId,
            telemetry.sessionId,
            telemetry.durationSec,
            telemetry.suggestionFollowRate,
        )
        
        return {"status": "ok", "sessionId": telemetry.sessionId}
        
    except Exception as e:
        logger.error("[BETA] Failed to store session: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/survey")
async def store_survey_response(survey: SurveyResponse):
    """Store post-session survey response"""
    try:
        survey_dir = DATA_DIR / "surveys"
        survey_dir.mkdir(parents=True, exist_ok=True)
        
        filename = f"survey_{survey.sessionId}.json"
        filepath = survey_dir / filename
        
        with open(filepath, "w") as f:
            json.dump(survey.dict(), f, indent=2)
        
        # Log trust signal
        trust_signal = "POSITIVE" if survey.wouldUseInRealInterview in ["definitely_yes", "probably_yes"] else "NEGATIVE"
        logger.info(
            "[BETA] Survey stored: user=%s trust=%s would_use=%s",
            survey.userId,
            trust_signal,
            survey.wouldUseInRealInterview,
        )
        
        return {"status": "ok", "sessionId": survey.sessionId}
        
    except Exception as e:
        logger.error("[BETA] Failed to store survey: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/issue")
async def store_issue_report(issue: IssueReport):
    """Store in-session issue report"""
    try:
        issues_dir = DATA_DIR / "issues"
        issues_dir.mkdir(parents=True, exist_ok=True)
        
        filename = f"issue_{issue.timestamp}_{issue.sessionId}.json"
        filepath = issues_dir / filename
        
        with open(filepath, "w") as f:
            json.dump(issue.dict(), f, indent=2)
        
        logger.warning(
            "[BETA] Issue reported: user=%s type=%s session=%s",
            issue.userId,
            issue.issueType,
            issue.sessionId,
        )
        
        return {"status": "ok", "timestamp": issue.timestamp}
        
    except Exception as e:
        logger.error("[BETA] Failed to store issue: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/report")
async def generate_beta_report():
    """Generate beta validation report"""
    try:
        report = BetaReportGenerator().generate()
        return report
    except Exception as e:
        logger.error("[BETA] Failed to generate report: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ============ Report Generator ============

class BetaReportGenerator:
    """Generates go/no-go report from collected telemetry"""
    
    def generate(self) -> Dict[str, Any]:
        sessions = self._load_sessions()
        surveys = self._load_surveys()
        
        if not sessions:
            return {
                "status": "no_data",
                "message": "No session data collected yet",
            }
        
        # Aggregate metrics
        total_users = len(set(s["userId"] for s in sessions))
        total_sessions = len(sessions)
        
        completed_sessions = [s for s in sessions if s.get("sessionCompleted", False)]
        completion_rate = len(completed_sessions) / total_sessions * 100 if total_sessions > 0 else 0
        
        # Users with 3+ sessions
        user_session_counts = {}
        for s in sessions:
            user_session_counts[s["userId"]] = user_session_counts.get(s["userId"], 0) + 1
        power_users = len([u for u, c in user_session_counts.items() if c >= 3])
        power_user_rate = power_users / total_users * 100 if total_users > 0 else 0
        
        # Latency
        latencies = [s["avgSuggestionLatencyMs"] for s in sessions if s.get("avgSuggestionLatencyMs", 0) > 0]
        avg_latency = sum(latencies) / len(latencies) if latencies else 0
        
        # Follow rate
        follow_rates = [s["suggestionFollowRate"] for s in sessions]
        avg_follow_rate = sum(follow_rates) / len(follow_rates) if follow_rates else 0
        
        # Errors
        total_errors = sum(s.get("errorCount", 0) for s in sessions)
        critical_failures = sum(1 for s in sessions if s.get("freezeCount", 0) > 2)
        
        # Survey analysis
        trust_scores = self._analyze_surveys(surveys)
        
        # Go/No-Go evaluation
        decision = self._evaluate_decision(
            completion_rate=completion_rate,
            power_user_rate=power_user_rate,
            avg_latency=avg_latency,
            avg_follow_rate=avg_follow_rate,
            critical_failures=critical_failures,
            trust_scores=trust_scores,
        )
        
        return {
            "generated_at": datetime.now().isoformat(),
            "summary": {
                "total_users": total_users,
                "total_sessions": total_sessions,
                "completion_rate": round(completion_rate, 1),
                "power_user_rate": round(power_user_rate, 1),
                "avg_latency_ms": round(avg_latency, 0),
                "avg_follow_rate": round(avg_follow_rate, 1),
                "critical_failures": critical_failures,
            },
            "trust_metrics": trust_scores,
            "decision": decision,
        }
    
    def _load_sessions(self) -> List[Dict]:
        sessions = []
        sessions_dir = DATA_DIR / "sessions"
        if not sessions_dir.exists():
            return sessions
        
        for user_dir in sessions_dir.iterdir():
            if user_dir.is_dir():
                for session_file in user_dir.glob("session_*.json"):
                    with open(session_file) as f:
                        sessions.append(json.load(f))
        
        return sessions
    
    def _load_surveys(self) -> List[Dict]:
        surveys = []
        survey_dir = DATA_DIR / "surveys"
        if not survey_dir.exists():
            return surveys
        
        for survey_file in survey_dir.glob("survey_*.json"):
            with open(survey_file) as f:
                surveys.append(json.load(f))
        
        return surveys
    
    def _analyze_surveys(self, surveys: List[Dict]) -> Dict[str, Any]:
        if not surveys:
            return {
                "total_responses": 0,
                "trust_score": 0,
                "would_use_in_real_interview": {},
            }
        
        # Would use in real interview breakdown
        would_use = {}
        for s in surveys:
            answer = s.get("wouldUseInRealInterview", "unknown")
            would_use[answer] = would_use.get(answer, 0) + 1
        
        # Calculate trust score
        trust_weights = {
            "definitely_yes": 100,
            "probably_yes": 75,
            "unsure": 50,
            "probably_not": 25,
            "definitely_not": 0,
        }
        
        trust_scores = [trust_weights.get(s.get("wouldUseInRealInterview", ""), 50) for s in surveys]
        avg_trust = sum(trust_scores) / len(trust_scores) if trust_scores else 0
        
        # Positive responses
        positive = sum(1 for s in surveys if s.get("wouldUseInRealInterview") in ["definitely_yes", "probably_yes"])
        positive_rate = positive / len(surveys) * 100 if surveys else 0
        
        # Critical feedback
        critical_feedback = [
            s.get("improvementSuggestion", "")
            for s in surveys
            if s.get("wouldUseInRealInterview") in ["probably_not", "definitely_not"]
        ]
        
        return {
            "total_responses": len(surveys),
            "trust_score": round(avg_trust, 1),
            "positive_rate": round(positive_rate, 1),
            "would_use_in_real_interview": would_use,
            "critical_feedback": [f for f in critical_feedback if f],
        }
    
    def _evaluate_decision(
        self,
        completion_rate: float,
        power_user_rate: float,
        avg_latency: float,
        avg_follow_rate: float,
        critical_failures: int,
        trust_scores: Dict,
    ) -> Dict[str, Any]:
        """Evaluate go/no-go based on criteria"""
        
        gates_passed = 0
        total_gates = 6
        gate_results = []
        
        # Gate 1: Completion rate > 70%
        passed = completion_rate >= 70
        gates_passed += int(passed)
        gate_results.append({
            "name": "Session Completion",
            "threshold": "≥70%",
            "actual": f"{completion_rate:.1f}%",
            "passed": passed,
        })
        
        # Gate 2: Power users (3+ sessions) > 50%
        passed = power_user_rate >= 50
        gates_passed += int(passed)
        gate_results.append({
            "name": "Return Users (3+ sessions)",
            "threshold": "≥50%",
            "actual": f"{power_user_rate:.1f}%",
            "passed": passed,
        })
        
        # Gate 3: Avg latency < 2s
        passed = avg_latency < 2000
        gates_passed += int(passed)
        gate_results.append({
            "name": "Suggestion Latency",
            "threshold": "<2000ms",
            "actual": f"{avg_latency:.0f}ms",
            "passed": passed,
        })
        
        # Gate 4: Follow rate > 40%
        passed = avg_follow_rate >= 40
        gates_passed += int(passed)
        gate_results.append({
            "name": "Suggestion Follow Rate",
            "threshold": "≥40%",
            "actual": f"{avg_follow_rate:.1f}%",
            "passed": passed,
        })
        
        # Gate 5: Critical failures < 3
        passed = critical_failures < 3
        gates_passed += int(passed)
        gate_results.append({
            "name": "Critical Failures",
            "threshold": "<3",
            "actual": str(critical_failures),
            "passed": passed,
        })
        
        # Gate 6: Trust score > 60
        trust_score = trust_scores.get("trust_score", 0)
        passed = trust_score >= 60
        gates_passed += int(passed)
        gate_results.append({
            "name": "Trust Score",
            "threshold": "≥60",
            "actual": f"{trust_score:.1f}",
            "passed": passed,
        })
        
        # Decision
        if gates_passed >= 5:
            verdict = "GO"
            recommendation = "Proceed to expanded beta (50 users)"
        elif gates_passed >= 3:
            verdict = "CONDITIONAL_GO"
            recommendation = "Fix failing gates and re-test with 5 users"
        else:
            verdict = "NO_GO"
            recommendation = "Major issues require resolution before launch"
        
        return {
            "verdict": verdict,
            "gates_passed": f"{gates_passed}/{total_gates}",
            "gate_results": gate_results,
            "recommendation": recommendation,
        }


# ============ Register Router ============

def include_router(app):
    """Include this router in the main FastAPI app"""
    app.include_router(router)
