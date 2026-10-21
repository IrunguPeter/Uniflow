const path = require('path');
const dotenv = require('dotenv');

// Load .env from the process working directory first (e.g. backend/.env), then
// fall back to the repository root .env so the backend works whether it is
// started from the repo root or from backend/.
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

module.exports = {};
