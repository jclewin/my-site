import {
  deliverMail,
  handleContact,
  kvStore,
  memoryStore,
  type MailBinding,
} from "../functions/lib/contact";

type ContactKv = {
  get: (key: string) => Promise<string | null>;
  put: (
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ) => Promise<void>;
};

type Env = {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  EMAIL?: MailBinding;
  CONTACT_KV?: ContactKv;
  RESEND_API_KEY?: string;
};

const memory = memoryStore();

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/contact") {
      return handleContact(request, {
        store: env.CONTACT_KV ? kvStore(env.CONTACT_KV) : memory,
        deliver: (mail) =>
          deliverMail(mail, {
            email: env.EMAIL,
            resendApiKey: env.RESEND_API_KEY,
          }),
      });
    }

    return env.ASSETS.fetch(request);
  },
};
