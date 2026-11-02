import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import {
  ContactLogged,
  deliverMail,
  handleContact,
  memoryStore,
} from './functions/lib/contact'

function contactApi(resendApiKey: string | undefined): Plugin {
  const store = memoryStore()

  return {
    name: 'contact-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0]
        if (path !== '/api/contact') {
          next()
          return
        }

        void (async () => {
          const chunks: Uint8Array[] = []
          let size = 0
          for await (const chunk of req) {
            const bytes =
              typeof chunk === 'string' ? Buffer.from(chunk) : chunk
            size += bytes.length
            if (size > 20_000) {
              res.statusCode = 413
              res.setHeader('content-type', 'application/json; charset=utf-8')
              res.end(
                JSON.stringify({
                  ok: false,
                  error: 'invalid',
                  message: 'That note is too long.',
                }),
              )
              return
            }
            chunks.push(bytes)
          }

          const headers = new Headers()
          for (const [key, value] of Object.entries(req.headers)) {
            if (
              value == null ||
              key === 'content-length' ||
              key === 'transfer-encoding'
            ) {
              continue
            }
            if (Array.isArray(value)) {
              for (const item of value) headers.append(key, item)
            } else {
              headers.set(key, value)
            }
          }

          const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          headers.set(
            'x-contact-ip',
            forwarded || req.socket.remoteAddress || 'local',
          )

          const host = headers.get('host') ?? '127.0.0.1'
          const request = new Request(`http://${host}/api/contact`, {
            method: req.method,
            headers,
            body:
              req.method === 'GET' || req.method === 'HEAD'
                ? undefined
                : Buffer.concat(chunks),
          })

          const response = await handleContact(request, {
            store,
            deliver: async (mail) => {
              if (!resendApiKey) {
                console.info(
                  `[contact] dev sink → ${mail.to}\nFrom: ${mail.replyTo}\nSubject: ${mail.subject}\n\n${mail.text}`,
                )
                throw new ContactLogged()
              }
              await deliverMail(mail, { resendApiKey })
            },
          })

          res.statusCode = response.status
          response.headers.forEach((value, key) => {
            res.setHeader(key, value)
          })
          res.end(Buffer.from(await response.arrayBuffer()))
        })().catch((error) => {
          console.error(error)
          if (res.headersSent) return
          res.statusCode = 500
          res.setHeader('content-type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ ok: false, error: 'send_failed' }))
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '')
  return {
    plugins: [react(), contactApi(env.RESEND_API_KEY)],
  }
})
