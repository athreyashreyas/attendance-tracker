/**
 * The relay behind Settings -> Talk to me.
 *
 * It takes a message the app has already composed and hands it to Resend, which
 * puts it in my inbox. Two things it does not take on trust:
 *
 *  1. Who sent it. The address is read from the caller's Supabase session, not
 *     from the request body, so the "from" line in my inbox cannot be spoofed
 *     by anything the client says.
 *  2. That the sender wants a reply sent into the void. That verified address
 *     becomes the mail's reply-to, so hitting Reply in my mail client writes
 *     back to the person who registered with Attend, with no address to copy
 *     out by hand and no admin screen to build.
 *
 * Deploy and configuration: see README.md beside this file.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

/** My inbox. Overridable so this is not the only place it is written down. */
const TO = Deno.env.get('FEEDBACK_TO') ?? 'athreya.shreyas@gmail.com';

/**
 * Resend's shared sender, which needs no domain of my own but may only deliver
 * to the address that owns the Resend account. That is exactly the shape of
 * this feature: every message goes to one place, mine.
 */
const FROM = Deno.env.get('FEEDBACK_FROM') ?? 'Attend <onboarding@resend.dev>';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

/** Generous next to the app's own 4,000, since the footer is added on top. */
const MAX_BODY = 8000;
const MAX_SUBJECT = 200;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!RESEND_API_KEY) {
    // Loud on my side, quiet on theirs: the app falls back to the mail app.
    console.error('RESEND_API_KEY is not set on this function.');
    return json({ error: 'Mail is not configured' }, 500);
  }

  // Who is actually writing. An unsigned caller gets nowhere.
  const authorization = req.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authorization } } }
  );
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return json({ error: 'Not signed in' }, 401);

  let payload: { kind?: unknown; subject?: unknown; body?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Expected a JSON body' }, 400);
  }

  const subject = typeof payload.subject === 'string' ? payload.subject.trim() : '';
  const body = typeof payload.body === 'string' ? payload.body.trim() : '';
  const kind = payload.kind === 'idea' ? 'idea' : 'bug';

  if (!body) return json({ error: 'The message is empty' }, 400);
  if (body.length > MAX_BODY || subject.length > MAX_SUBJECT)
    return json({ error: 'The message is too long' }, 413);

  const replyTo = auth.user.email ?? undefined;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      // The whole point: Reply goes to the address they registered with.
      reply_to: replyTo,
      subject: subject || `Attend · ${kind === 'idea' ? 'Feature idea' : 'Bug report'}`,
      text: body,
    }),
  });

  if (!response.ok) {
    console.error('Resend refused the message:', response.status, await response.text());
    return json({ error: 'The message could not be delivered' }, 502);
  }

  return json({ ok: true });
});
