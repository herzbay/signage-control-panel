import express = require("express");
import bcrypt = require("bcryptjs");
import jwt = require("jsonwebtoken");
import { z } from "zod";
import supabaseConfig = require("../config/supabase");

const supabase = supabaseConfig.supabaseAdmin;

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

// POST /api/auth/login
const login: express.RequestHandler = async (req, res) => {
  const validation = loginSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid email or password format",
      errors: validation.error.issues,
    });
    return;
  }

  const { email, password } = validation.data;

  try {
    const { data: admin, error } = await supabase
      .from("admins")
      .select("id, email, password_hash, full_name, is_active")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error("Admin lookup error:", error.message);

      res.status(500).json({
        success: false,
        message: "Failed to authenticate admin",
      });
      return;
    }

    if (!admin || !admin.is_active) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      admin.password_hash
    );

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured");
    }

    const token = jwt.sign(
      {
        sub: admin.id,
        email: admin.email,
        role: "admin",
      },
      jwtSecret,
      {
        expiresIn: "1h",
      }
    );

    await supabase
      .from("admins")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", admin.id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        token_type: "Bearer",
        expires_in: 3600,
        admin: {
          id: admin.id,
          email: admin.email,
          full_name: admin.full_name,
        },
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to login",
    });
  }
};

export = { login };