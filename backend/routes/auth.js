const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");

const router = express.Router();

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required." });
  }

  const users = db.getUsers();
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ message: "An account with this email already exists." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = { userId: uuidv4(), name, email, passwordHash, createdDate: new Date().toISOString() };
  users.push(user);
  db.saveUsers(users);

  const token = signToken(user.userId);
  res.status(201).json({ token, user: { userId: user.userId, name: user.name, email: user.email } });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const users = db.getUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(401).json({ message: "Invalid email or password." });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid email or password." });

  const token = signToken(user.userId);
  res.json({ token, user: { userId: user.userId, name: user.name, email: user.email } });
});

// Simple stub - in production this would email a reset link.
router.post("/forgot-password", (req, res) => {
  const { email } = req.body;
  const users = db.getUsers();
  const exists = users.some((u) => u.email.toLowerCase() === (email || "").toLowerCase());
  // Always respond the same way to avoid leaking which emails are registered.
  res.json({
    message: exists
      ? "If this were production, a reset link would be emailed now."
      : "If an account exists for this email, a reset link would be sent.",
  });
});

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || "dev_secret", {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

module.exports = router;
