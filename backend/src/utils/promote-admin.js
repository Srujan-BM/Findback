require('dotenv').config();
const connectDatabase = require('../config/db');
const User = require('../models/User');

async function promoteAdmin() {
  if (!process.env.ADMIN_EMAIL) throw new Error('Set ADMIN_EMAIL to the existing account you want to make an admin.');
  await connectDatabase();
  const user = await User.findOneAndUpdate(
    { email: process.env.ADMIN_EMAIL.toLowerCase() },
    { role: 'admin' },
    { new: true },
  ).select('name email role');
  if (!user) throw new Error(`No FindBack account exists for ${process.env.ADMIN_EMAIL}. Register that account first.`);
  console.log(`Administrator access enabled for ${user.email}.`);
  await User.db.close();
}

promoteAdmin().catch(async (error) => {
  console.error(error.message);
  await User.db.close().catch(() => {});
  process.exitCode = 1;
});
