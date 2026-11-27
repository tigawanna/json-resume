import {
  account,
  apikey,
  invitation,
  jwks,
  member,
  oauthAccessToken,
  oauthClient,
  oauthConsent,
  oauthRefreshToken,
  organization,
  session,
  user,
  verification,
} from "../schema/auth-schema.ts";
import { drizzleZod } from "./table.ts";

export const userZod = drizzleZod({ table: user });
export const sessionZod = drizzleZod({ table: session });
export const accountZod = drizzleZod({ table: account });
export const verificationZod = drizzleZod({ table: verification });
export const organizationZod = drizzleZod({ table: organization });
export const memberZod = drizzleZod({ table: member });
export const invitationZod = drizzleZod({ table: invitation });
export const jwksZod = drizzleZod({ table: jwks });
export const oauthClientZod = drizzleZod({ table: oauthClient });
export const oauthRefreshTokenZod = drizzleZod({ table: oauthRefreshToken });
export const oauthAccessTokenZod = drizzleZod({ table: oauthAccessToken });
export const oauthConsentZod = drizzleZod({ table: oauthConsent });
export const apikeyZod = drizzleZod({ table: apikey });
