import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_FRONTEND_URL || "https://atluri-ai.vercel.app";
const API = process.env.API_URL || `${BASE}/api`;

async function apiPost(url: string, body: object, token: string = "") {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return { status: resp.status, body: await resp.json().catch(() => ({})) };
}

test.describe("🤖 Live Interview Engine Tests", () => {
  let token = "";

  test.beforeAll(async () => {
    // Register and login a temporary user for interview testing
    const email = `interview_candidate_${Date.now()}@automation.com`;
    await apiPost(`${API}/auth/signup`, { email, password: "TestPass123!", display_name: "Candidate" });
    const { body } = await apiPost(`${API}/auth/login`, { email, password: "TestPass123!" });
    token = body.access_token;
    expect(token).toBeTruthy();
  });

  test("Conduct Live Interview: Java Full Stack Developer", async () => {
    console.log("\n🚀 Starting Interview for: Java Full Stack Developer");
    
    // 1. Start Interview
    const { status, body } = await apiPost(`${API}/interview/start`, { role: "Java Full Stack Developer" }, token);
    expect(status).toBe(200);
    const sessionId = body.session_id;
    let nextQuestion = body.question;
    
    console.log(`✅ Session ID: ${sessionId}`);
    console.log(`🗣️ Interviewer: ${nextQuestion}`);
    expect(nextQuestion).toBeTruthy();

    // 2. Answer Question 1
    const answer1 = "I have 5 years of experience using Java Spring Boot for the backend and React for the frontend. I deploy my apps using Docker.";
    console.log(`👨‍💻 Candidate: ${answer1}`);
    const r1 = await apiPost(`${API}/interview/answer`, { session_id: sessionId, answer: answer1 }, token);
    expect(r1.status).toBe(200);
    
    console.log(`🗣️ Interviewer: ${r1.body.next_question}`);
    expect(r1.body.next_question).toBeTruthy();
    expect(r1.body.evaluation).toBeTruthy(); // Should have evaluated our previous answer

    // 3. Answer Question 2
    const answer2 = "For database connections in Spring Boot, I use Spring Data JPA with Hibernate. I handle transactions using the @Transactional annotation.";
    console.log(`👨‍💻 Candidate: ${answer2}`);
    const r2 = await apiPost(`${API}/interview/answer`, { session_id: sessionId, answer: answer2 }, token);
    expect(r2.status).toBe(200);
    console.log(`🗣️ Interviewer: ${r2.body.next_question || "Interview Complete!"}`);
  });

  test("Conduct Live Interview: DevOps with SRE role", async () => {
    console.log("\n🚀 Starting Interview for: DevOps with SRE role");
    
    // 1. Start Interview
    const { status, body } = await apiPost(`${API}/interview/start`, { role: "DevOps with SRE role" }, token);
    expect(status).toBe(200);
    const sessionId = body.session_id;
    let nextQuestion = body.question;
    
    console.log(`✅ Session ID: ${sessionId}`);
    console.log(`🗣️ Interviewer: ${nextQuestion}`);
    expect(nextQuestion).toBeTruthy();

    // 2. Answer Question 1
    const answer1 = "I implement CI/CD pipelines using GitHub Actions and ArgoCD. For monitoring, I set up Prometheus and Grafana to track the four golden signals.";
    console.log(`👨‍💻 Candidate: ${answer1}`);
    const r1 = await apiPost(`${API}/interview/answer`, { session_id: sessionId, answer: answer1 }, token);
    expect(r1.status).toBe(200);
    
    console.log(`🗣️ Interviewer: ${r1.body.next_question}`);
    expect(r1.body.next_question).toBeTruthy();
    expect(r1.body.evaluation).toBeTruthy();

    // 3. Answer Question 2
    const answer2 = "To handle a production outage, I would first acknowledge the alert, check the monitoring dashboards to identify the failing service, and rollback the recent deployment if necessary to restore the SLO.";
    console.log(`👨‍💻 Candidate: ${answer2}`);
    const r2 = await apiPost(`${API}/interview/answer`, { session_id: sessionId, answer: answer2 }, token);
    expect(r2.status).toBe(200);
    console.log(`🗣️ Interviewer: ${r2.body.next_question || "Interview Complete!"}`);
  });
});
