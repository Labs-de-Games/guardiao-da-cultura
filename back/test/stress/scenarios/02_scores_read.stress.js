import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import http from "k6/http";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3001";

const tokens = new SharedArray("tokens", () => {
  const data = open("../data/tokens.json");
  return JSON.parse(data);
});

export const options = {
  stages: [
    { duration: "2m", target: 100 },
    { duration: "2m", target: 500 },
    { duration: "3m", target: 2000 },
    { duration: "3m", target: 2000 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<200"],
    http_req_failed: ["rate<0.01"],
  },
  tags: {
    scenario: "read_endpoints",
  },
};

const endpoints = [
  (userId) => ({ url: `${BASE_URL}/api/v1/scores/${userId}`, name: "scores" }),
  (userId) => ({
    url: `${BASE_URL}/api/v1/progression/${userId}`,
    name: "progression",
  }),
  (userId) => ({
    url: `${BASE_URL}/api/v1/badges/${userId}`,
    name: "badges",
  }),
];

export default function () {
  const { userId, token } = tokens[Math.floor(Math.random() * tokens.length)];
  const endpoint =
    endpoints[Math.floor(Math.random() * endpoints.length)](userId);

  const res = http.get(endpoint.url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    tags: { endpoint: endpoint.name },
  });

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response time < 500ms": (r) => r.timings.duration < 500,
  });

  sleep(Math.random() * 1 + 0.2);
}
