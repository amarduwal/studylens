import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, userPreferences, subscriptions, pricingPlans, studyStreaks } from "@/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          throw new Error("Invalid email or password");
        }

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
    async createUser({ user }) {
      if (user.id) {
        // Create default preferences
        await db.insert(userPreferences).values({
          userId: user.id,
        });

        // Create study streak record
        await db.insert(studyStreaks).values({
          userId: user.id,
          currentStreak: 0,
          longestStreak: 0,
          totalActiveDays: 0,
        });

        // Assign free plan
        const freePlan = await db.query.pricingPlans.findFirst({
          where: eq(pricingPlans.slug, "free"),  // Changed: name → slug
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
