import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

export const ensureConfiguredAdmin = async (): Promise<void> => {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!username || !password || !email) {
    throw new Error('ADMIN_USERNAME, ADMIN_PASSWORD, and ADMIN_EMAIL are required.');
  }

  if (password.length < 10) {
    throw new Error('ADMIN_PASSWORD must be at least 10 characters long.');
  }

  const existingAdmin = await User.findByUsername(username);
  const passwordHash = await bcrypt.hash(password, 12);

  if (existingAdmin) {
    existingAdmin.username = username;
    existingAdmin.fullName = existingAdmin.fullName || username;
    existingAdmin.email = email;
    existingAdmin.password = passwordHash;
    existingAdmin.role = 'admin';
    existingAdmin.department = undefined;
    await existingAdmin.save();
    return;
  }

  await User.create({
    username,
    fullName: username,
    email,
    password: passwordHash,
    role: 'admin',
  });
};