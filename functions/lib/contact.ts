export const INBOX = "hello@jordanlewin.ca";
export const FROM = "notes@jordanlewin.ca";

const SITE_HOSTS = new Set(["jordanlewin.ca", "www.jordanlewin.ca"]);

/** Per sender address, per email domain, and per IP. */
export const LIMITS = {
  address: { max: 3, windowMs: 24 * 60 * 60 * 1000 },
  domain: { max: 12, windowMs: 24 * 60 * 60 * 1000 },
  ip: { max: 5, windowMs: 60 * 60 * 1000 },
} as const;

const MAX_BODY = 20_000;

export class ContactUnavailable extends Error {
  constructor() {
    super("Mail delivery is not configured.");
  }
}

export class ContactLogged extends Error {
  constructor() {
    super("Logged instead of emailed.");
  }
}

type Bucket = { count: number; reset: number };

type Charge =
  | { ok: true; refund: () => Promise<void> }
  | { ok: false; retryAt: number };

export type LimitStore = {
  charge: (key: string, max: number, windowMs: number) => Promise<Charge>;
};

export type OutboundMail = {
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  text: string;
};

type ContactDeps = {
  store: LimitStore;
  deliver: (mail: OutboundMail) => Promise<void>;
};

type Payload = {
  name?: unknown;
  email?: unknown;
  message?: unknown;
  website?: unknown;
};

export function memoryStore(): LimitStore {
  const buckets = new Map<string, Bucket>();

  return {
    async charge(key, max, windowMs) {
      const now = Date.now();
      if (buckets.size > 4000) {
        for (const [id, bucket] of buckets) {
          if (bucket.reset <= now) buckets.delete(id);
        }
      }

      const current = buckets.get(key);
      const bucket =
        current && current.reset > now
          ? current
          : { count: 0, reset: now + windowMs };

      if (bucket.count >= max) {
        buckets.set(key, bucket);
        return { ok: false, retryAt: bucket.reset };
      }

      bucket.count += 1;
      buckets.set(key, bucket);
      return {
        ok: true,
        async refund() {
          const live = buckets.get(key);
          if (live !== bucket) return;
          live.count = Math.max(0, live.count - 1);
        },
      };
    },
  };
}

export function kvStore(kv: {
  get: (key: string) => Promise<string | null>;
  put: (
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ) => Promise<void>;
}): LimitStore {
  return {
    async charge(key, max, windowMs) {
      const now = Date.now();
      const raw = await kv.get(key);
      let bucket: Bucket = { count: 0, reset: now + windowMs };
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<Bucket>;
          if (
            typeof parsed.count === "number" &&
            typeof parsed.reset === "number" &&
            parsed.reset > now
          ) {
            bucket = { count: parsed.count, reset: parsed.reset };
          }
        } catch {
          bucket = { count: 0, reset: now + windowMs };
        }
      }

      if (bucket.count >= max) return { ok: false, retryAt: bucket.reset };

      bucket.count += 1;
      const ttl = Math.max(60, Math.ceil((bucket.reset - now) / 1000));
      await kv.put(key, JSON.stringify(bucket), { expirationTtl: ttl });
      return {
        ok: true,
        async refund() {
          const latest = await kv.get(key);
          if (!latest) return;
          try {
            const parsed = JSON.parse(latest) as Partial<Bucket>;
            if (typeof parsed.count !== "number" || typeof parsed.reset !== "number") {
              return;
            }
            const next = {
              count: Math.max(0, parsed.count - 1),
              reset: parsed.reset,
            };
            const nextTtl = Math.max(60, Math.ceil((next.reset - Date.now()) / 1000));
            await kv.put(key, JSON.stringify(next), { expirationTtl: nextTtl });
          } catch {
            return;
          }
        },
      };
    },
  };
}

export type MailBinding = {
  send: (message: {
    to: string;
    from: { email: string; name?: string };
    replyTo?: string;
    subject: string;
    text: string;
  }) => Promise<unknown>;
};

export async function deliverMail(
  mail: OutboundMail,
  options: { email?: MailBinding; resendApiKey?: string },
) {
  if (options.email) {
    await options.email.send({
      to: mail.to,
      from: { email: mail.from, name: "Jordan Lewin" },
      replyTo: mail.replyTo,
      subject: mail.subject,
      text: mail.text,
    });
    return;
  }

  if (options.resendApiKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${options.resendApiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: `Jordan Lewin <${mail.from}>`,
        to: [mail.to],
        reply_to: mail.replyTo,
        subject: mail.subject,
        text: mail.text,
      }),
    });
    if (!response.ok) throw new Error("Mail provider rejected the note.");
    return;
  }

  throw new ContactUnavailable();
}

export async function handleContact(request: Request, deps: ContactDeps) {
  if (request.method !== "POST") {
    return json(405, { ok: false, error: "method" });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY) {
    return json(413, {
      ok: false,
      error: "invalid",
      message: "That note is too long.",
    });
  }

  if (!originAllowed(request)) {
    return json(403, {
      ok: false,
      error: "origin",
      message: "This form only accepts notes from jordanlewin.ca.",
    });
  }

  let payload: Payload;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return invalid("That note could not be read.");
    }
    payload = parsed;
  } catch {
    return invalid("That note could not be read.");
  }

  if (typeof payload.website === "string" && payload.website.trim() !== "") {
    return json(200, { ok: true });
  }
  if (payload.website != null && typeof payload.website !== "string") {
    return json(200, { ok: true });
  }

  const name = typeof payload.name === "string" ? cleanLine(payload.name, 80) : "";
  const email = typeof payload.email === "string" ? cleanEmail(payload.email) : null;
  const message =
    typeof payload.message === "string" ? cleanMessage(payload.message) : "";

  if (!name) return invalid("Add your name.");
  if (!email) return invalid("Add a real email address.");
  if (!message) return invalid("Write a note first.");

  const domain = email.slice(email.lastIndexOf("@") + 1);
  const ip = clientIp(request);
  const charges: Array<Extract<Charge, { ok: true }>> = [];

  const limited = await chargeAll(deps.store, charges, [
    [`addr:${email}`, LIMITS.address, "rate_address"],
    [`domain:${domain}`, LIMITS.domain, "rate_domain"],
    [`ip:${ip}`, LIMITS.ip, "rate_ip"],
  ]);
  if (limited) return limited;

  const mail: OutboundMail = {
    to: INBOX,
    from: FROM,
    replyTo: email,
    subject: `Note from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\n\n${message}\n`,
  };

  try {
    await deps.deliver(mail);
  } catch (error) {
    if (error instanceof ContactLogged) {
      return json(200, { ok: true, dev: true });
    }
    await refundAll(charges);
    if (error instanceof ContactUnavailable) {
      return json(503, {
        ok: false,
        error: "unavailable",
        message: "The form can't send mail yet. Email hello@jordanlewin.ca instead.",
      });
    }
    return json(502, {
      ok: false,
      error: "send_failed",
      message: "That didn't send. Try again in a moment.",
    });
  }

  return json(200, { ok: true });
}

async function chargeAll(
  store: LimitStore,
  charges: Array<Extract<Charge, { ok: true }>>,
  checks: Array<[string, { max: number; windowMs: number }, string]>,
) {
  for (const [key, limit, error] of checks) {
    const result = await store.charge(key, limit.max, limit.windowMs);
    if (!result.ok) {
      await refundAll(charges);
      return json(429, { ok: false, error, retryAt: result.retryAt });
    }
    charges.push(result);
  }
  return null;
}

async function refundAll(charges: Array<Extract<Charge, { ok: true }>>) {
  await Promise.all(charges.map((charge) => charge.refund()));
}

function originAllowed(request: Request) {
  const origin = request.headers.get("origin") ?? request.headers.get("referer");
  if (!origin) return false;

  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") {
    return url.protocol === "http:";
  }
  return url.protocol === "https:" && SITE_HOSTS.has(host);
}

function clientIp(request: Request) {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return normalizeIp(cf);

  const host = new URL(request.url).hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return normalizeIp(request.headers.get("x-contact-ip") ?? "local");
  }
  return "unknown";
}

function normalizeIp(ip: string) {
  const trimmed = ip.trim().slice(0, 64);
  return trimmed.startsWith("::ffff:") ? trimmed.slice(7) : trimmed;
}

function cleanLine(value: string, max: number) {
  return stripControls(value, false).replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (email.length > 200) return null;
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) return null;
  return email;
}

function cleanMessage(value: string) {
  const message = stripControls(value, true).replace(/[ \t\f\v]+/g, " ").trim();
  if (message.length > 4000) return message.slice(0, 4000);
  return message;
}

function stripControls(value: string, keepNewlines: boolean) {
  let out = "";
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (keepNewlines && (code === 10 || code === 13)) {
      if (code === 13 && value.charCodeAt(index + 1) === 10) index += 1;
      out += "\n";
      continue;
    }
    if (code < 32 || code === 127) continue;
    out += value[index];
  }
  return out;
}

function invalid(message: string) {
  return json(400, { ok: false, error: "invalid", message });
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
