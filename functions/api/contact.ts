import {
  deliverMail,
  handleContact,
  kvStore,
  memoryStore,
  type MailBinding,
} from "../lib/contact";

type ContactKv = {
  get: (key: string) => Promise<string | null>;
  put: (
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ) => Promise<void>;
};

type Env = {
  EMAIL?: MailBinding;
  CONTACT_KV?: ContactKv;
  RESEND_API_KEY?: string;
};

const memory = memoryStore();

export const onRequest = (context: { request: Request; env: Env }) => {
  const { env } = context;
  return handleContact(context.request, {
    store: env.CONTACT_KV ? kvStore(env.CONTACT_KV) : memory,
    deliver: (mail) =>
      deliverMail(mail, {
        email: env.EMAIL,
        resendApiKey: env.RESEND_API_KEY,
      }),
  });
};
