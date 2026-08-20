import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 }, // Ramp-up to 100 VUs
    { duration: '1m', target: 500 }, // Level 2: 500 VUs
    { duration: '30s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'], // 95% of search requests must complete under 300ms
    http_req_failed: ['rate<0.01'],   // Error rate must be < 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5000/api';

export default function () {
  // Test Project Search & Filtering with GIN Trigram index
  const searchRes = http.get(`${BASE_URL}/projects?category=Web%20Development&search=Fullstack`);
  check(searchRes, {
    'search status 200': (r) => r.status === 200,
    'projects returned': (r) => Array.isArray(r.json().data?.projects),
  });

  sleep(1);
}
