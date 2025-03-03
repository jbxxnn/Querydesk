import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcrypt-ts";
import { getUser } from "@/app/db";
import { authConfig } from "./auth.config";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize({ email, password }: any) {
        let user = await getUser(email);
        if (user.length === 0) return null;
        let passwordsMatch = await compare(password, user[0].password!);
        if (passwordsMatch) return user[0] as any;
      },
    }),
  ],
  callbacks: {
    // Add the role to the JWT token
    async jwt({ token, user }) {
      if (user) {
        // Include the role in the token
        token.role = user.role;
        console.log("JWT token after processing:", token);
      }
      return token;
    },
    // Add the role to the session
    async session({ session, token }) {
      if (session.user && token.role) {
        // Add the role to the session user object
        session.user.role = token.role;

        console.log("Session data after processing:", session);
      }
      return session;
    },
  },
});
