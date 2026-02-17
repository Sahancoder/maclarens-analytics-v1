import NextAuth, { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

const authMode = (process.env.NEXT_PUBLIC_AUTH_MODE || process.env.AUTH_MODE || "dev").toLowerCase();

const hasAzureConfig =
  Boolean(process.env.AZURE_AD_CLIENT_ID) &&
  Boolean(process.env.AZURE_AD_CLIENT_SECRET) &&
  Boolean(process.env.AZURE_AD_TENANT_ID);

const authOptions: NextAuthOptions = {
  debug: true,
  providers: [
    ...(hasAzureConfig
      ? [
          AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID as string,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET as string,
            tenantId: process.env.AZURE_AD_TENANT_ID as string,
            authorization: {
              params: {
                scope: "openid profile email User.Read",
              },
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      console.log("[NextAuth] signIn callback:", {
        provider: account?.provider,
        email: (profile as any)?.email || (profile as any)?.preferred_username,
      });

      // Allow all Azure AD sign-ins — RBAC is checked on the callback page
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === "azure-ad") {
        token.accessToken = account.id_token || account.access_token;
        token.idToken = account.id_token || account.access_token;

        const email =
          (profile as any)?.email ||
          (profile as any)?.preferred_username ||
          (profile as any)?.upn;

        if (email) token.email = email;
        if ((profile as any)?.name) token.name = (profile as any).name;

        console.log("[NextAuth] JWT - user email:", email);
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = (token.accessToken as string | undefined) || undefined;
      session.idToken =
        (token.accessToken as string | undefined) ||
        (token.idToken as string | undefined) ||
        undefined;

      if (session.user) {
        if (token.sub) session.user.id = token.sub;
        if (token.email) session.user.email = token.email as string;
        if (token.name) session.user.name = token.name as string;
        if ((token as any).role) session.user.role = (token as any).role as string;
      }
      return session;
    },
  },
  // ── ERROR EVENT: Captures exact OAuth error details ──────────────
  events: {
    async signIn(message) {
      console.log("[NextAuth] EVENT signIn:", JSON.stringify(message, null, 2));
    },
  },
  logger: {
    error(code, metadata) {
      console.error("[NextAuth] ERROR:", code, JSON.stringify(metadata, null, 2));
    },
    warn(code) {
      console.warn("[NextAuth] WARN:", code);
    },
    debug(code, metadata) {
      console.log("[NextAuth] DEBUG:", code, JSON.stringify(metadata, null, 2));
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
};

console.log("[NextAuth] Config:", {
  hasAzureConfig,
  authMode,
  tenantId: process.env.AZURE_AD_TENANT_ID?.substring(0, 8) + "...",
  clientId: process.env.AZURE_AD_CLIENT_ID?.substring(0, 8) + "...",
  secretLength: process.env.AZURE_AD_CLIENT_SECRET?.length,
});

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
