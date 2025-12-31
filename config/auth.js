require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  WARNING: JWT_SECRET is not set. Using development fallback secret. Set JWT_SECRET in your .env for production.');
}
module.exports = { JWT_SECRET };
