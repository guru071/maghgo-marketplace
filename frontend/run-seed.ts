import { GET } from './src/app/api/seed-themes/route';
GET().then(res => res.json()).then(console.log).catch(console.error);
