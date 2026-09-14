/**
 * Runtime environment variable validation.
 * Call `validateEnv()` from app/layout.tsx (server component) so missing
 * required vars surface immediately on startup rather than at request time.
 */

interface EnvSpec {
  required: string[];
  optional: string[];
}

const spec: EnvSpec = {
  required: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ],
  optional: [
    'RESEND_API_KEY',
    'ANTHROPIC_API_KEY',
    'SQUARE_ACCESS_TOKEN',
    'VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY',
  ],
};

/**
 * Validates required environment variables at startup and warns about missing
 * optional ones.  In production a missing required variable throws so the
 * deployment fails fast; in development it also throws so developers notice
 * immediately.
 */
export function validateEnv(): void {
  const missing = spec.required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    const list = missing.join(', ');
    throw new Error(
      `[env] Missing required environment variable(s): ${list}\n` +
        'Set them in your .env.local (development) or Vercel project settings (production).',
    );
  }

  const missingOptional = spec.optional.filter((key) => !process.env[key]);
  if (missingOptional.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn(
      `[env] Optional environment variable(s) not set — related features will be disabled: ${missingOptional.join(', ')}`,
    );
  }
}
