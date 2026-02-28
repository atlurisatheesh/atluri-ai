# def generate_questions(role: str):
#     base = [
#         "Explain your background and experience.",
#         "What are your strongest technical skills?",
#         "Describe a challenging project you worked on.",
#         "How do you handle production incidents?",
#         "Explain a system you designed end-to-end."
#     ]

#     if "aws" in role.lower():
#         base.extend([
#             "Explain VPC architecture.",
#             "How does ECS differ from EKS?",
#             "How do you secure IAM roles?",
#             "Explain Auto Scaling & Load Balancers."
#         ])

#     if "devops" in role.lower():
#         base.extend([
#             "Explain CI/CD pipeline design.",
#             "How do you manage Terraform state?",
#             "Explain Kubernetes architecture."
#         ])

#     return base[:8]


# from openai import OpenAI
# from core.config import OPENAI_API_KEY

# client = OpenAI(api_key=OPENAI_API_KEY)

# def generate_question(role: str, history: list):

#     prompt = f"""
# You are a professional technical interviewer.

# Job Role: {role}

# Previous Q&A:
# {history}

# Ask the NEXT best interview question.
# Keep it concise and professional.
# """

#     res = client.responses.create(
#         model="gpt-4.1-mini",
#         input=prompt
#     )

#     return res.output_text.strip()



from openai import OpenAI
from core.config import OPENAI_API_KEY
from app.company_modes import get_company_mode_prompt

client = OpenAI(api_key=OPENAI_API_KEY)


# ---------- STATIC BASE QUESTIONS ----------

def generate_questions(role: str):
    base = [
        "Explain your background and experience.",
        "What are your strongest technical skills?",
        "Describe a challenging project you worked on.",
        "How do you handle production incidents?",
        "Explain a system you designed end-to-end."
    ]

    if "aws" in role.lower():
        base.extend([
            "Explain VPC architecture.",
            "How does ECS differ from EKS?",
            "How do you secure IAM roles?",
            "Explain Auto Scaling & Load Balancers."
        ])

    if "devops" in role.lower():
        base.extend([
            "Explain CI/CD pipeline design.",
            "How do you manage Terraform state?",
            "Explain Kubernetes architecture."
        ])

    return base[:5]


# ---------- AI FOLLOW-UP QUESTIONS ----------

def generate_question(role: str, history: list, company_mode: str = "general"):

    company_prompt = get_company_mode_prompt(company_mode)

    prompt = f"""
You are a professional technical interviewer.

Job Role: {role}
{company_prompt}

Previous Q&A:
{history}

Ask the NEXT best interview question.
Keep it concise and professional.
"""

    res = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt
    )

    return res.output_text.strip()
