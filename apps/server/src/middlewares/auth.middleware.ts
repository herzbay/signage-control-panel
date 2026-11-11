import express = require("express");
import jwt = require("jsonwebtoken");

interface AdminTokenPayload extends jwt.JwtPayload {
  sub: string;
  email: string;
  role: string;
}

const authenticateAdmin: express.RequestHandler = (
  req,
  res,
  next
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Authentication token is required",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Invalid authentication token",
    });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    res.status(500).json({
      success: false,
      message: "JWT_SECRET is not configured",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (
      typeof decoded === "string" ||
      decoded.role !== "admin" ||
      typeof decoded.sub !== "string" ||
      typeof decoded.email !== "string"
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
      return;
    }

    const adminPayload = decoded as AdminTokenPayload;

    res.locals.admin = {
      id: adminPayload.sub,
      email: adminPayload.email,
      role: adminPayload.role,
    };

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
};

export = { authenticateAdmin };