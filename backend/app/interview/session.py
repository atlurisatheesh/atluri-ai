# interview_sessions = {}

# def create_session(user_id, role, questions):
#     interview_sessions[user_id] = {
#         "role": role,
#         "questions": questions,
#         "answers": [],
#         "evaluations": [],
#         "current": 0
#     }

# def get_session(user_id):
#     return interview_sessions.get(user_id)

# def save_answer(user_id, answer, evaluation):
#     s = interview_sessions[user_id]
#     s["answers"].append(answer)
#     s["evaluations"].append(evaluation)
#     s["current"] += 1
# def add_question(session_id: str, question: str):
#     sessions[session_id]["questions"].append(question)


# def close_session(session_id: str):
#     sessions[session_id]["closed"] = True


import uuid

sessions = {}


def create_session(user_id: str, role: str, company_mode: str = "general"):
    session_id = str(uuid.uuid4())

    sessions[session_id] = {
        "user_id": user_id,
        "role": role,
        "company_mode": company_mode,
        "questions": [],
        "answers": [],
        "evaluations": [],
        "current": 0,
        "closed": False
    }

    return session_id


def get_session(session_id: str):
    return sessions.get(session_id)


def add_question(session_id: str, question: str):
    sessions[session_id]["questions"].append(question)


def save_answer(session_id: str, answer: str, evaluation: dict):
    s = sessions[session_id]
    s["answers"].append(answer)
    s["evaluations"].append(evaluation)
    s["current"] += 1


def close_session(session_id: str):
    sessions[session_id]["closed"] = True
