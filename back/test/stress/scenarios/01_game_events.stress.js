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
    { duration: "2m", target: 200 },
    { duration: "3m", target: 500 },
    { duration: "3m", target: 1000 },
    { duration: "5m", target: 1000 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"],
    http_req_failed: ["rate<0.01"],
    http_reqs: ["rate>100"],
  },
  tags: {
    scenario: "game_events",
  },
};

export default function () {
  const { userId, token } = tokens[Math.floor(Math.random() * tokens.length)];
  const payload = payloads[Math.floor(Math.random() * payloads.length)];

  const body = JSON.stringify({
    ...payload,
    userId,
    timestamp: new Date().toISOString(),
  });

  const res = http.post(`${BASE_URL}/api/v1/events`, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    tags: { event_type: payload.type },
  });

  check(res, {
    "status is 201": (r) => r.status === 201,
    "response has success": (r) => {
      try {
        return JSON.parse(r.body).success === true;
      } catch {
        return false;
      }
    },
  });

  sleep(Math.random() * 2 + 0.5);
}
