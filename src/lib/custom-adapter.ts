import { Adapter } from "next-auth/adapters";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";

export function CustomAdapter(): Adapter {
  return {
    async createUser(data) {
      const [user] = await db.insert(users).values({
        id: data.id as string,
        name: data.name,
        email: data.email,
        emailVerified: data.emailVerified,
        avatarUrl: data.image,
      }).returning();
      return {
        id: user.id,
        name: user.name,
        email: user.email!,
        emailVerified: user.emailVerified,
        image: user.avatarUrl,
      };
    },

    async getUser(id) {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      if (!user) return null;
      return {
        id: user.id,
        name: user.name,
        email: user.email!,
        emailVerified: user.emailVerified,
        image: user.avatarUrl,
      };
    },

    async getUserByEmail(email) {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user) return null;
      return {
        id: user.id,
        name: user.name,
        email: user.email!,
        emailVerified: user.emailVerified,
        image: user.avatarUrl,
      };
    },

    async getUserByAccount({ providerAccountId, provider }) {
      const [result] = await db
        .select({ user: users })
        .from(accounts)
        .innerJoin(users, eq(accounts.userId, users.id))
        .where(
          and(
            eq(accounts.providerAccountId, providerAccountId),
            eq(accounts.provider, provider as "google") // Adjust as needed for other providers
          )
        );

      if (!result?.user) return null;
      return {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email!,
        emailVerified: result.user.emailVerified,
        image: result.user.avatarUrl,
      };
    },

    async updateUser(data) {
      if (!data.id) throw new Error("No user id");

      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.emailVerified !== undefined) updateData.emailVerified = data.emailVerified;
      if (data.image !== undefined) updateData.avatarUrl = data.image;

      const [user] = await db.update(users)
        .set(updateData)
        .where(eq(users.id, data.id))
        .returning();

      if (!user) throw new Error("User not found");
      return {
        id: user.id,
        name: user.name,
        email: user.email!,
        emailVerified: user.emailVerified,
        image: user.avatarUrl,
      };
    },

    async deleteUser(id) {
      await db.delete(users).where(eq(users.id, id));
    },

    async linkAccount(data) {
      await db.insert(accounts).values({
        userId: data.userId,
        type: data.type,
        provider: data.provider,
        providerAccountId: data.providerAccountId,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_at,
        tokenType: data.token_type,
        scope: data.scope,
        idToken: data.id_token,
        sessionState: data.session_state,
      });
    },

    async unlinkAccount({ providerAccountId, provider }) {
      await db.delete(accounts).where(
        and(
          eq(accounts.providerAccountId, providerAccountId),
          eq(accounts.provider, provider as "google") // Adjust as needed for other providers
        )
      );
    },

    async createSession(data) {
      const [session] = await db.insert(sessions).values({
        userId: data.userId,
        sessionToken: data.sessionToken,
        expiresAt: data.expires,
      }).returning();
      return {
        sessionToken: session.sessionToken,
        userId: session.userId,
        expires: session.expiresAt
      };
    },

    async getSessionAndUser(sessionToken) {
      const [result] = await db
        .select({ session: sessions, user: users })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(
          and(
            eq(sessions.sessionToken, sessionToken),
            gte(sessions.expiresAt, new Date())
          )
        );

      if (!result) return null;
      return {
        session: {
          sessionToken: result.session.sessionToken,
          userId: result.session.userId,
          expires: result.session.expiresAt
        },
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email!,
          emailVerified: result.user.emailVerified,
          image: result.user.avatarUrl,
        }
      };
    },

    async updateSession(data) {
      if (!data.sessionToken) throw new Error("No session token");
      const [session] = await db.update(sessions)
        .set({ expiresAt: data.expires })
        .where(eq(sessions.sessionToken, data.sessionToken))
        .returning();

      if (!session) return null;
      return {
        sessionToken: session.sessionToken,
        userId: session.userId,
        expires: session.expiresAt
      };
    },

    async deleteSession(sessionToken) {
      await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
    },

    async createVerificationToken(data) {
      const [token] = await db.insert(verificationTokens).values({
        identifier: data.identifier,
        token: data.token,
        expires: data.expires,
      }).returning();
      return token;
    },

    async useVerificationToken({ identifier, token }) {
      const [result] = await db
        .select()
        .from(verificationTokens)
        .where(
          and(
            eq(verificationTokens.identifier, identifier),
            eq(verificationTokens.token, token),
            gte(verificationTokens.expires, new Date())
          )
        );

      if (!result) return null;
      await db.delete(verificationTokens).where(
        and(
          eq(verificationTokens.identifier, identifier),
          eq(verificationTokens.token, token)
        )
      );
      return result;
    },
  };
}
