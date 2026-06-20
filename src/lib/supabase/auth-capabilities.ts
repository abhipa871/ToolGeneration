import "server-only";

type AuthSettings = {
  external?: Record<string, boolean>;
  disable_signup?: boolean;
};

export type AuthCapabilities = {
  email: boolean;
  google: boolean;
  signup: boolean;
};

export async function getAuthCapabilities(): Promise<AuthCapabilities> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Auth settings returned ${response.status}`);
    const settings = await response.json() as AuthSettings;
    return {
      email: settings.external?.email === true,
      google: settings.external?.google === true,
      signup: settings.disable_signup !== true,
    };
  } catch {
    return { email: true, google: false, signup: true };
  }
}
