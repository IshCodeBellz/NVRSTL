/* eslint-disable */
import { NextAuthOptions, User as NextAuthUser } from "next-auth";
// import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { compare } from "bcryptjs";
import { SecurityService } from "./security";
import { SecurityEventType } from "../security";

// Extend the User interface
interface ExtendedUser extends NextAuthUser {
  id: string;
  isAdmin: boolean;
  emailVerified: boolean;
}

export const authOptionsEnhanced: NextAuthOptions = {
  // adapter: PrismaAdapter(prisma), // Commented out - install @next-auth/prisma-adapter if needed
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        mfaToken: { label: "MFA Token", type: "text", optional: true },
      },
      async authorize(credentials, req) {
        // Use multiple logging methods to ensure visibility
        console.log(
          "🔐 Enhanced Auth: Attempting login for",
          credentials?.email
        );
        console.error(
          "🔐 Enhanced Auth: Attempting login for",
          credentials?.email
        );
        process.stdout.write("🔐 Enhanced Auth: Attempting login\n");

        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Enhanced Auth: Missing credentials");
          console.error("❌ Enhanced Auth: Missing credentials");
          return null;
        }

        try {
          // Find user
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          console.log(
            "👤 Enhanced Auth: Found user:",
            !!user,
            user
              ? `(attempts: ${
                  user.failedLoginAttempts
                }, locked: ${!!user.lockedAt})`
              : ""
          );

          if (!user) {
            // Log failed login attempt
            if (req) {
              await SecurityService.logSecurityEvent(
                SecurityEventType.SUSPICIOUS_LOGIN,
                SecurityService.extractSecurityContext(req as NextRequest)
              );
            }
            return null;
          }

          // Check if account is locked
          if (
            user.lockedAt &&
            user.lockedAt > new Date(Date.now() - 30 * 60 * 1000)
          ) {
            throw new Error(
              "Account temporarily locked due to security concerns"
            );
          }

          // Verify password
          const isValidPassword = await compare(
            credentials.password,
            user.passwordHash
          );

          if (!isValidPassword) {
            console.log(
              "❌ Enhanced Auth: Invalid password, incrementing failed attempts"
            );

            // Increment failed attempts
            const updatedUser = await prisma.user.update({
              where: { id: user.id },
              data: {
                failedLoginAttempts: user.failedLoginAttempts + 1,
                // Lock account after 5 failed attempts
                lockedAt:
                  user.failedLoginAttempts >= 4 ? new Date() : user.lockedAt,
              },
            });

            console.log(
              "🚫 Enhanced Auth: Failed attempts:",
              updatedUser.failedLoginAttempts,
              "Locked:",
              !!updatedUser.lockedAt
            );

            // Log failed login
            if (req) {
              await SecurityService.logSecurityEvent(
                SecurityEventType.SUSPICIOUS_LOGIN,
                SecurityService.extractSecurityContext(
                  req as NextRequest,
                  user.id
                )
              );
            }

            return null;
          }

          // Check MFA if enabled (placeholder for now due to Prisma sync issues)
          // if (user.mfaEnabled && !credentials.mfaToken) {
          //   throw new Error('MFA_REQUIRED');
          // }

          console.log(
            "✅ Enhanced Auth: Password valid, resetting failed attempts"
          );

          // Reset failed attempts on successful login
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: 0,
              lockedAt: null,
              lastLoginAt: new Date(),
            },
          });

          console.log(
            "🎉 Enhanced Auth: Login successful, updated lastLoginAt"
          );

          // Log successful login
          if (req) {
            await SecurityService.logSecurityEvent(
              SecurityEventType.MFA_VERIFICATION_SUCCESS,
              SecurityService.extractSecurityContext(
                req as NextRequest,
                user.id
              )
            );
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin,
            emailVerified: user.emailVerified,
          };
        } catch (error) {
          console.error("Error:", error);
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 4 * 60 * 60, // Update every 4 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        const extendedUser = user as ExtendedUser;
        // Back-compat: set both id and uid so older code/tests using uid keep working.
        token.id = extendedUser.id;
        (token as any).uid = extendedUser.id;
        token.isAdmin = extendedUser.isAdmin;
        token.emailVerified = Boolean(extendedUser.emailVerified);
        token.sessionStart = Date.now();
      }

      // If we don't have a user (existing session token path), ensure id/uid coherence
      // and lazily populate isAdmin when missing for backward compatibility with older tests.
      if (!user) {
        const uid = (token as any).uid as string | undefined;
        const id = (token as any).id as string | undefined;

        // Ensure both aliases exist if either one is present
        if (uid && !id) {
          (token as any).id = uid;
        } else if (id && !uid) {
          (token as any).uid = id;
        }

        // Lazy-load isAdmin if absent but we have a user identifier
        if (typeof (token as any).isAdmin === "undefined") {
          const userId =
            ((token as any).id as string) || ((token as any).uid as string);
          if (userId) {
            try {
              const dbUser = await prisma.user.findUnique({
                where: { id: userId },
              });
              if (dbUser) {
                (token as any).isAdmin = dbUser.isAdmin;
                if (typeof (token as any).emailVerified === "undefined") {
                  (token as any).emailVerified = Boolean(dbUser.emailVerified);
                }
              }
            } catch (e) {
              console.error("auth.jwt lazy isAdmin lookup failed", e);
            }
          }
        }
      }

      // Check for session timeout
      if (
        token.sessionStart &&
        Date.now() - (token.sessionStart as number) > 24 * 60 * 60 * 1000
      ) {
        // Session expired - return token but could add expiry logic
        console.log("Session timeout detected");
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        // Support id or uid for backward compatibility.
        session.user.id =
          ((token as any).id as string) || ((token as any).uid as string);
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.emailVerified = token.emailVerified as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      // Log successful sign-in event
      console.log(`User signed in: ${user?.email}`);
    },
    async signOut({ session, token }) {
      // Log sign-out event
      if (session?.user?.email) {
        console.log(`User signed out: ${session.user.email}`);
      }
    },
  },
};
