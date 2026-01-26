import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, userPreferences, subscriptions, pricingPlans } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CustomAdapter } from "./custom-adapter";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: CustomAdapter(),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user || !user.passwordHash) {
          throw new Error("Invalid email or password");
        }

        // Check if email is verified
        if (!user.emailVerified) {
          throw new Error("UNVERIFIED_EMAIL:" + user.id);
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        // Update last login
        await db
          .update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, user.id));

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
      }

      // Refresh user data on update
      if (trigger === "update" && session) {
        token.name = session.name;
        token.image = session.image;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;

        // Fetch user with subscription
        const userWithSub = await db.query.users.findFirst({
          where: eq(users.id, token.id as string),
          with: {
            subscription: {
              with: {
                plan: true,
              },
            },
            preferredLanguage: true,  // Changed: relation name
          },
        });

        if (userWithSub) {
          session.user.subscriptionTier = userWithSub.subscriptionTier || "guest";
          session.user.plan = userWithSub.subscription?.plan || null;
          session.user.maxImagesPerScan = userWithSub.subscription?.plan?.maxImagesPerScan || 1;
          session.user.avatarUrl = userWithSub.avatarUrl || '';

          // Preferences now on users table, not separate preferences table
          session.user.preferences = {
            preferredLanguage: userWithSub.preferredLanguage?.code || "en",  // From relation
            educationLevel: userWithSub.educationLevel,  // Now on users table
            theme: userWithSub.theme || "system",  // Now on users table
          };
        }
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (user.id) {
        // Session info will be added via API middleware
        // Update last login
        await db
          .update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, user.id));
      }
    },
    async createUser({ user }) {
      if (user.id) {
        // Create default preferences
        await db.insert(userPreferences).values({
          userId: user.id,
        }).onConflictDoNothing();

        // Assign free plan
        const freePlan = await db.query.pricingPlans.findFirst({
          where: eq(pricingPlans.slug, "free"),
        });

        if (freePlan) {
          await db.insert(subscriptions).values({
            userId: user.id,
            planId: freePlan.id,
            status: "active",
          });
        }
      }
    },
  },
});
