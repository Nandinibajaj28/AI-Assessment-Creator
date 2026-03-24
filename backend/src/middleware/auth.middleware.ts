import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/token";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authorization.slice("Bearer ".length).trim();
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  (req as any).user = {
    id: payload.sub,
    email: payload.email,
    name: payload.name
  };

  return next();
}
