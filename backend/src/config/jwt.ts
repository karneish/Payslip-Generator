import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'shinecraft_super_secret_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const generateToken = (payload: any): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, JWT_SECRET);
};

export { JWT_SECRET, JWT_EXPIRES_IN };
