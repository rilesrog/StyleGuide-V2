import { type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      userName?: string;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const rows = await db.select().from(usersTable).where(eq(usersTable.token, token)).limit(1);
  if (!rows.length) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  req.userId = rows[0].id;
  req.userName = rows[0].name;
  next();
}
