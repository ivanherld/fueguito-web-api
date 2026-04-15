#!/usr/bin/env node
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const generateJWTSecret = () => {
  return crypto.randomBytes(64).toString('hex');
};

const generateAdminPassHash = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

console.log('=== Generador de Secretos ===\n');

// JWT Secret
const jwtSecret = generateJWTSecret();
console.log('JWT_SECRET_KEY:');
console.log(jwtSecret);
console.log();

// Admin Pass Hash
const adminPassword = process.argv[2] || 'strongPass123';
console.log(`Hasheando contraseña admin: "${adminPassword}"\n`);

generateAdminPassHash(adminPassword).then((hash) => {
  console.log('ADMIN_PASS_HASH:');
  console.log(hash);
  console.log();
  console.log('=== Copia estos valores a tu .env ===');
});
