import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp-up to 50 VUs
    { duration: '1m', target: 100 },  // Level 1: 100 VUs
    { duration: '30s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests must complete under 200ms
    http_req_failed: ['rate<0.01'],   // Error rate must be < 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5000/api';

export default function () {
  // Test Health / Readiness Check
  const readyRes = http.get(`${BASE_URL}/ready`);
  check(readyRes, {
    'readiness status 200': (r) => r.status === 200,
    'ready db connected': (r) => r.json().data.db === 'connected',
  });

  sleep(1);
}
