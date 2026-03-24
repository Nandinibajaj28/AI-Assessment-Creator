import { Request, Response } from "express";
import { User } from "../models/user.model";
import {
  createLocalUser,
  findLocalUserByEmail,
  isMongoConnected,
} from "../services/local-data.service";
import { hashPassword, verifyPassword } from "../utils/password";
import { generateToken } from "../utils/token";

function sanitizeUser(user: { _id: unknown; name: string; email: string }) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email
  };
}

export async function signup(req: Request, res: Response) {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }

    const existingUser = isMongoConnected()
      ? await User.findOne({ email }).lean()
      : findLocalUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const { hash, salt } = hashPassword(password);
    const user = isMongoConnected()
      ? await User.create({
          name,
          email,
          passwordHash: hash,
          passwordSalt: salt
        })
      : createLocalUser({
          name,
          email,
          passwordHash: hash,
          passwordSalt: salt
        });

    const safeUser = sanitizeUser(user);

    return res.status(201).json({
      token: generateToken(safeUser),
      user: safeUser
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[AuthAPI] Signup failed:", message);
    return res.status(500).json({ error: "Server error" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = isMongoConnected() ? await User.findOne({ email }) : findLocalUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isValid = verifyPassword(password, user.passwordSalt, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const safeUser = sanitizeUser(user);

    return res.json({
      token: generateToken(safeUser),
      user: safeUser
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[AuthAPI] Login failed:", message);
    return res.status(500).json({ error: "Server error" });
  }
}

export async function me(req: Request, res: Response) {
  if (!(req as any).user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return res.json({ user: (req as any).user });
}
