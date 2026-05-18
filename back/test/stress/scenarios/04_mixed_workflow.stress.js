import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import http from "k6/http";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3001";

const tokens = new SharedArray("tokens", () => {
  const data = open("../data/tokens.json");
  return JSON.parse(data);
});

const payloads = new SharedArray("payloads", () => {
  const data = open("../data/payloads.json");
  return JSON.parse(data);
});

export const options = {
  stages: [
    { duration: "2m", target: 50 },
    { duration: "3m", target: 200 },
    { duration: "3m", target: 500 },
    { duration: "2m", target: 500 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<800"],
    http_req_failed: ["rate<0.01"],
  },
  tags: {
    scenario: "mixed_workflow",
  },
};

export default function () {
  const { userId, token } = tokens[Math.floor(Math.random() * tokens.length)];
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const numEvents = Math.floor(Math.random() * 3) + 3;

  for (let i = 0; i < numEvents; i++) {
    const payload = payloads[Math.floor(Math.random() * payloads.length)];
    const body = JSON.stringify({
      ...payload,
      userId,
      timestamp: new Date().toISOString(),
    });

    const eventRes = http.post(`${BASE_URL}/api/v1/events`, body, {
      headers,
      tags: { step: "event", event_type: payload.type },
    });

    check(eventRes, {
      "event: status 201": (r) => r.status === 201,
    });

    sleep(Math.random() * 0.5 + 0.2);
  }

  const scoreRes = http.get(`${BASE_URL}/api/v1/scores/${userId}`, {
    headers,
    tags: { step: "scores_read" },
  });
  check(scoreRes, { "scores: status 200": (r) => r.status === 200 });

  sleep(Math.random() * 0.5 + 0.2);

  const progressRes = http.get(`${BASE_URL}/api/v1/progression/${userId}`, {
    headers,
    tags: { step: "progression_read" },
  });
  check(progressRes, { "progression: status 200": (r) => r.status === 200 });

  sleep(Math.random() * 0.3 + 0.1);

  const badgeRes = http.get(`${BASE_URL}/api/v1/badges/${userId}`, {
    headers,
    tags: { step: "badges_read" },
  });
  check(badgeRes, { "badges: status 200": (r) => r.status === 200 });

  sleep(Math.random() * 1 + 0.5);
}
