import { test, expect } from '@playwright/test';

const BACKEND_URL = process.env.API_URL || "https://atluri-ai.vercel.app";
let authToken = "";

test.describe("Dynamic Interview Simulation", () => {
  
  test.beforeAll(async ({ request }) => {
    // 1. Get an auth token using a test user
    const email = `candidate_${Date.now()}@test.com`;
    const pwd = "Password123!";
    
    await request.post(`${BACKEND_URL}/api/auth/register`, {
      data: { email, password: pwd, name: "Test Candidate" }
    });
    
    const loginRes = await request.post(`${BACKEND_URL}/api/auth/login`, {
      data: { email, password: pwd }
    });
    const loginData = await loginRes.json();
    console.log("Login Data:", loginData);
    authToken = loginData.access_token || loginData.token || "";
    if (!authToken) {
      console.log("Register response:", await (await request.post(`${BACKEND_URL}/api/auth/signup`, { data: { email, password: pwd, display_name: "Test" } })).json());
      const loginRes2 = await request.post(`${BACKEND_URL}/api/auth/login`, {
        data: { email, password: pwd }
      });
      const loginData2 = await loginRes2.json();
      authToken = loginData2.access_token || loginData2.token || "";
    }
  });

  test("Interview 1: Java Full Stack Developer", async ({ request }) => {
    console.log("\n🚀 Starting Interview for: Java Full Stack Developer");
    
    // START INTERVIEW
    const startRes = await request.post(`${BACKEND_URL}/api/interview/start`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { role: "Java Full Stack Developer" }
    });
    
    const startData = await startRes.json();
    if (!startData.session_id) {
      console.error("FAILED TO START. Response:", startData);
    }
    expect(startData.session_id).toBeDefined();
    console.log(`✅ Session ID: ${startData.session_id}`);
    console.log(`🗣️ Interviewer: ${startData.question}`);

    // CANDIDATE ANSWER 1
    const candidateAnswer1 = "I have 5 years of experience using Java Spring Boot for the backend and React for the frontend. I deploy my apps using Docker and AWS.";
    console.log(`👨‍💻 Candidate: ${candidateAnswer1}`);

    const answer1Res = await request.post(`${BACKEND_URL}/api/interview/answer`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { session_id: startData.session_id, answer: candidateAnswer1 }
    });
    const answer1Data = await answer1Res.json();
    console.log(`🗣️ Interviewer: ${answer1Data.next_question || "Done!"}`);
    
    // CANDIDATE ANSWER 2
    const candidateAnswer2 = "I usually use JWT for authentication and REST APIs for communication between the frontend and backend.";
    console.log(`👨‍💻 Candidate: ${candidateAnswer2}`);

    const answer2Res = await request.post(`${BACKEND_URL}/api/interview/answer`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { session_id: startData.session_id, answer: candidateAnswer2 }
    });
    const answer2Data = await answer2Res.json();
    console.log(`🗣️ Interviewer: ${answer2Data.next_question || "Done!"}`);
  });

  test("Interview 2: DevOps with SRE role", async ({ request }) => {
    console.log("\n🚀 Starting Interview for: DevOps with SRE role");
    
    // START INTERVIEW
    const startRes = await request.post(`${BACKEND_URL}/api/interview/start`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { role: "DevOps Engineer and SRE" }
    });
    
    const startData = await startRes.json();
    if (!startData.session_id) {
      console.error("FAILED TO START. Response:", startData);
    }
    expect(startData.session_id).toBeDefined();
    console.log(`✅ Session ID: ${startData.session_id}`);
    console.log(`🗣️ Interviewer: ${startData.question}`);

    // CANDIDATE ANSWER 1
    const candidateAnswer1 = "I implement CI/CD pipelines using GitHub Actions and ArgoCD for Kubernetes deployments. I also setup Prometheus and Grafana for monitoring.";
    console.log(`👨‍💻 Candidate: ${candidateAnswer1}`);

    const answer1Res = await request.post(`${BACKEND_URL}/api/interview/answer`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { session_id: startData.session_id, answer: candidateAnswer1 }
    });
    const answer1Data = await answer1Res.json();
    console.log(`🗣️ Interviewer: ${answer1Data.next_question || "Done!"}`);
    
    // CANDIDATE ANSWER 2
    const candidateAnswer2 = "To ensure high availability, I configure auto-scaling groups and multi-AZ deployments. If a node fails, Kubernetes automatically reschedules the pods.";
    console.log(`👨‍💻 Candidate: ${candidateAnswer2}`);

    const answer2Res = await request.post(`${BACKEND_URL}/api/interview/answer`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { session_id: startData.session_id, answer: candidateAnswer2 }
    });
    const answer2Data = await answer2Res.json();
    console.log(`🗣️ Interviewer: ${answer2Data.next_question || "Done!"}`);
  });
});
