import { DefaultSession, DefaultUser } from "next-auth";
import { PricingPlan } from "@/db/schema";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      subscriptionTier: "guest" | "free" | "premium" | "enterprise";
      avatarUrl?: string;
      maxImagesPerScan?: number;
      plan: PricingPlan | null;
      preferences: {
        preferredLanguage: string;
        educationLevel: string | null;
        theme: string;
      } | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    subscriptionTier?: "guest" | "free" | "premium" | "enterprise";
    avatarUrl?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
  }
}
