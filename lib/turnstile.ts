const TURNSTILE_TIMEOUT_MS = 8000;

export async function verifyTurnstileToken(token?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { success: true, demo: true };
  if (!token) return { success: false, message: "Verification token missing." };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TURNSTILE_TIMEOUT_MS);

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      signal: controller.signal
    });

    if (!response.ok) {
      return { success: false, message: "Verification service unavailable. Please retry." };
    }

    const data = await response.json();
    if (!data.success) return { success: false, message: "Human verification failed." };

    return { success: true };
  } catch {
    return { success: false, message: "Verification request timed out. Please retry." };
  } finally {
    clearTimeout(timeout);
  }
}
