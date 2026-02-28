class InterviewState:

    def __init__(self):
        self.engine = None
        self.scores = []
        self.last_question = None

    def start(self):
        from app.interview.engine import InterviewEngine
        self.engine = InterviewEngine()
        self.scores = []
        self.last_question = None

    def next_question(self):
        q = self.engine.next_question()
        self.last_question = q
        return q

    def add_score(self, score: dict):
        self.scores.append(score)

    def final_report(self):
        if not self.scores:
            return {}

        def avg(key):
            return sum(s[key] for s in self.scores) // len(self.scores)

        return {
            "technical": avg("technical"),
            "communication": avg("communication"),
            "confidence": avg("confidence"),
            "overall": (avg("technical") + avg("communication") + avg("confidence")) // 3
        }


interview_session = InterviewState()
