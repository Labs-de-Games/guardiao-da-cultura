import { check, sleep } from "k6";
import http from "k6/http";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3001";

export const options = {
  stages: [
    { duration: "10s", target: 50 },
    { duration: "10s", target: 50 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],
  },
  tags: {
    scenario: "auth_rate_limit",
  },
};

export default function () {
  const res = http.post(`${BASE_URL}/api/v1/auth/refresh`, JSON.stringify({}), {
    headers: { "Content-Type": "application/json" },
  });

  const underLimit = res.status === 401;
  const rateLimited = res.status === 429;

  check(res, {
    "under limit: 401 or rate limited: 429": (r) =>
      r.status === 401 || r.status === 429,
    "rate limited response has Retry-After": (r) => {
      if (r.status === 429) {
        return r.headers["Retry-After"] !== undefined;
      }
      return true;
    },
  });

  if (rateLimited) {
    console.log(`Rate limited after ${__VU} VUs`);
  }

  sleep(0.1);
}
