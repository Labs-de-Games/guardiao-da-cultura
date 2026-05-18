import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import http from "k6/http";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3001";
const NO_AUTH = __ENV.NO_AUTH === "true";

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
    { duration: "1m", target: 50 },
    { duration: "2m", target: 200 },
    { duration: "2m", target: 500 },
    { duration: "2m", target: 1000 },
    { duration: "3m", target: 1000 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
  },
  tags: {
    scenario: "no_auth_baseline",
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

  const headers = { "Content-Type": "application/json" };
  if (!NO_AUTH) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = http.post(`${BASE_URL}/api/v1/events`, body, { headers });

  check(res, {
    "status is 201 or 401": (r) => r.status === 201 || r.status === 401,
  });

  if (__ITER === 0 && __VU === 0) {
    console.log(
      `[no_auth_baseline] Running with${NO_AUTH ? "" : "out"} NO_AUTH=true`,
    );
    console.log(
      `[no_auth_baseline] Expected status: ${NO_AUTH ? "201" : "401"}`,
    );
  }

  sleep(Math.random() * 1 + 0.3);
}
