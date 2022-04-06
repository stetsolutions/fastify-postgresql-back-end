import fp from 'fastify-plugin'
import * as nodemailer from 'nodemailer'

import { config } from '../config'

interface MailOptions {
  from: string | undefined
  to: string | undefined
  subject: string
  text: string
}

export default fp(async (fastify, opts) => {
  fastify.decorate('mailer', async function (mailOptions: MailOptions) {
    const transporter = nodemailer.createTransport(
      config.mail.transport as object
    )

    const sendMail = await transporter.sendMail(mailOptions)

    return sendMail
  })
})

declare module 'fastify' {
  export interface FastifyInstance {
    mailer(options: MailOptions): nodemailer.SentMessageInfo
  }
}
