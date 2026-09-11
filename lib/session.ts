import { cookies } from "next/headers"
import { getIronSession, type SessionOptions } from "iron-session"

export interface SessionData {
  userId?: string
}

const password = process.env.SESSION_SECRET

if (!password || password.length < 32) {
  throw new Error(
    "SESSION_SECRET must be set to a random string of at least 32 characters (see .env.example)"
  )
}

export const sessionOptions: SessionOptions = {
  password,
  cookieName: "docs_app_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions)
}
