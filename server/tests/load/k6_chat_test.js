import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 200 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<150'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5000/api';

export default function () {
  // Test chat conversations listing API latency
  const chatRes = http.get(`${BASE_URL}/chat/conversations`);
  check(chatRes, {
    'chat API status 200 or 401': (r) => r.status === 200 || r.status === 401,
  });

  sleep(1);
}
