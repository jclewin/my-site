import { useEffect, useRef, useState } from "react";
import SynthwaveSheen from "../../components/common/SynthwaveSheen";
import Footer from "../../components/layout/Footer";
import ContactField from "./ContactField";

const INBOX = "hello@jordanlewin.ca";
const SENT_HOLD_MS = 3400;

type Notice = { tone: "ok" | "bad"; text: string };

const RATE_COPY: Record<string, string> = {
  rate_address: "That email has sent enough notes for today.",
  rate_domain: "That email domain has sent enough notes for today.",
  rate_ip: "Too many notes from this network. Try again in a little while.",
  origin: "This form only accepts notes from jordanlewin.ca.",
  unavailable: `The form can't send mail yet. Email ${INBOX} instead.`,
  send_failed: "That didn't send. Try again in a moment.",
};

function noticeFor(data: { error?: string; message?: string } | null): string {
  if (!data) return "That didn't send. Try again in a moment.";
  if (data.error === "invalid" && data.message) return data.message;
  if (data.error && RATE_COPY[data.error]) return RATE_COPY[data.error];
  if (data.message) return data.message;
  return "That didn't send. Try again in a moment.";
}

const TRIANGLE = "39,107 361,107 200,387";

function SentScene() {
  return (
    <div className="contact-launch" aria-hidden="true">
      <div className="contact-launch-ring">
        <span className="contact-launch-mail">
          <svg viewBox="0 0 128 88">
            <rect
              className="contact-launch-mail-body"
              x="6"
              y="16"
              width="116"
              height="64"
            />
            <path
              className="contact-launch-mail-flap"
              d="M10 22 L64 50 L118 22"
            />
          </svg>
        </span>
        <svg className="contact-launch-peaks" viewBox="0 0 400 400">
          <g className="contact-launch-tris">
            <polygon className="contact-launch-tri" points={TRIANGLE} />
            <polygon className="contact-launch-tri" points={TRIANGLE} />
            <polygon className="contact-launch-tri" points={TRIANGLE} />
          </g>
        </svg>
      </div>
    </div>
  );
}

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const hold = useRef(false);

  useEffect(() => {
    if (!sent) return;
    const timer = window.setTimeout(() => {
      hold.current = false;
      setSent(false);
    }, SENT_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [sent]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || hold.current) return;
    setPending(true);
    setNotice(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, message, website }),
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        dev?: boolean;
        error?: string;
        message?: string;
      } | null;

      if (response.ok && data?.ok) {
        setName("");
        setEmail("");
        setMessage("");
        hold.current = true;
        setSent(true);
        setNotice({
          tone: "ok",
          text: data.dev
            ? `DO NOT TALK TO ME.`
            : `Sent. It will reach ${INBOX}.`,
        });
        return;
      }

      setNotice({ tone: "bad", text: noticeFor(data) });
    } catch {
      setNotice({
        tone: "bad",
        text: "That didn't send. Try again in a moment.",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <section id="contact" className="contact">
      <ContactField />

      <div className="contact-stage">
        <p className="eyebrow">Contact</p>
        <h2>Contact Me</h2>
        <p className="lede">
          Send a note and it lands at <a href={`mailto:${INBOX}`}>{INBOX}</a>.
        </p>

        <form
          className={sent ? "contact-card is-sent" : "contact-card"}
          onSubmit={onSubmit}
          noValidate
        >
          <SentScene />
          <div className="contact-fields">
            <div className="contact-row">
              <label>
                <span>Name</span>
                <input
                  name="name"
                  autoComplete="name"
                  maxLength={80}
                  value={name}
                  placeholder="Your name"
                  required
                  disabled={pending || sent}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  maxLength={200}
                  value={email}
                  placeholder="you@domain.com"
                  required
                  disabled={pending || sent}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
            </div>
            <label>
              <span>Note</span>
              <textarea
                name="message"
                rows={6}
                maxLength={4000}
                value={message}
                placeholder="Say hello."
                required
                disabled={pending || sent}
                onChange={(event) => setMessage(event.target.value)}
              />
            </label>

            <div className="contact-honey" aria-hidden="true" inert>
              <label>
                Website
                <input
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                />
              </label>
            </div>

            <div className="contact-actions">
              <button
                className="contact-send"
                type="submit"
                disabled={pending || sent}
              >
                <span className="contact-send-border">
                  <span className="contact-send-face">
                    <SynthwaveSheen className="contact-send-sheen" />
                    <span className="contact-send-label">
                      {sent ? "Sent" : pending ? "Sending" : "Send"}
                    </span>
                  </span>
                </span>
              </button>
            </div>
          </div>

          <p
            className={
              notice ? `contact-status is-${notice.tone}` : "contact-status"
            }
            role="status"
          >
            {notice?.text ?? ""}
          </p>
        </form>
      </div>

      <Footer />
    </section>
  );
}
