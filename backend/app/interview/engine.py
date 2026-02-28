# from app.state import user_context

# interview_state = {
#     "mode": None,
#     "history": [],
#     "score": 0
# }

# def start_interview(mode: str):
#     interview_state["mode"] = mode
#     interview_state["history"] = []
#     interview_state["score"] = 0

#     if mode == "behavioral":
#         return "Tell me about yourself and your professional background."
#     elif mode == "technical":
#         return "Explain your most challenging technical project."
#     else:
#         return "Invalid interview mode."

# def add_answer(answer: str):
#     interview_state["history"].append(answer)

# def get_state():
#     return interview_state
# from app.interview.questions import generate_questions
# from app.interview.evaluator import evaluate_answer
# from app.interview.scorer import calculate_final_score

# def run_interview(role: str, answers: list):
#     questions = generate_questions(role)

#     results = []

#     for q, ans in zip(questions, answers):
#         evaluation = evaluate_answer(q, ans)
#         results.append(evaluation)

#     final_score, recommendation = calculate_final_score(results)

#     return {
#         "questions": questions,
#         "results": results,
#         "final_score": final_score,
#         "recommendation": recommendation
#     }
# from app.interview.session import create_session, get_session, save_answer

# def start_interview(user_id, role):
#     questions = generate_questions(role)
#     create_session(user_id, role, questions)
#     return questions[0]

# def submit_answer(user_id, answer):
#     session = get_session(user_id)
#     q = session["questions"][session["current"]]

#     evaluation = evaluate_answer(q, answer)
#     save_answer(user_id, answer, evaluation)

#     if session["current"] >= len(session["questions"]):
#         score, decision = calculate_final_score(session["evaluations"])
#         return {
#             "done": True,
#             "score": score,
#             "decision": decision,
#             "evaluations": session["evaluations"]
#         }

#     return {
#         "done": False,
#         "next_question": session["questions"][session["current"]]
#     }


# from app.interview.questions import generate_question
# from app.interview.evaluator import evaluate_answer
# from app.interview.scorer import calculate_final_score
# from app.interview.session import (
#     create_session,
#     get_session,
#     save_answer,
#     add_question,
#     close_session
# )


# class AIInterviewEngine:

#     def start(self, user_id: str, role: str):
#         session_id = create_session(user_id, role)

#         first_question = generate_question(role, [])

#         add_question(session_id, first_question)

#         return session_id, first_question

#     def submit_answer(self, session_id: str, answer: str):

#         session = get_session(session_id)

#         question = session["questions"][-1]

#         evaluation = evaluate_answer(question, answer)

#         save_answer(session_id, answer, evaluation)

#         # End interview after 5 questions
#         if session["current"] >= 5:
#             score, decision = calculate_final_score(session["evaluations"])
#             close_session(session_id)

#             return {
#                 "done": True,
#                 "score": score,
#                 "decision": decision,
#                 "evaluations": session["evaluations"]
#             }

#         history = list(zip(session["questions"], session["answers"]))

#         next_question = generate_question(session["role"], history)

#         add_question(session_id, next_question)

#         return {
#             "done": False,
#             "next_question": next_question,
#             "evaluation": evaluation
#         }


from app.interview.questions import generate_question
from app.interview.evaluator import evaluate_answer
from app.interview.scorer import calculate_final_score
from app.interview.session import (
    create_session,
    get_session,
    save_answer,
    add_question,
    close_session
)


class AIInterviewEngine:

    def start(self, user_id: str, role: str, company_mode: str = "general"):
        session_id = create_session(user_id, role, company_mode=company_mode)

        first_question = generate_question(role, [], company_mode=company_mode)

        add_question(session_id, first_question)

        return session_id, first_question

    def submit_answer(self, session_id: str, answer: str):

        session = get_session(session_id)

        if not session:
            raise Exception("Invalid interview session")

        question = session["questions"][-1]

        evaluation = evaluate_answer(question, answer)

        save_answer(session_id, answer, evaluation)

        # Finish after 5 questions
        if session["current"] >= 5:
            score, decision = calculate_final_score(session["evaluations"])
            close_session(session_id)

            return {
                "done": True,
                "score": score,
                "decision": decision,
                "evaluations": session["evaluations"]
            }

        history = list(zip(session["questions"], session["answers"]))

        next_question = generate_question(session["role"], history, company_mode=session.get("company_mode", "general"))

        add_question(session_id, next_question)

        return {
            "done": False,
            "next_question": next_question,
            "evaluation": evaluation
        }
