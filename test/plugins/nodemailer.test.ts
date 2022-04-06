import Fastify from 'fastify'
import Mailer from '../../src/plugins/nodemailer'
import { config } from '../../src/config'
import { test } from 'tap'

test('nodemailer :: standalone', async t => {
  const fastify = Fastify()

  void fastify.register(Mailer)

  await fastify.ready()

  const mailOptions = {
    from: config.mail.transport.auth.user,
    to: `${config.test.username}+admin@${config.test.domain}`,
    subject: 'Test',
    text: 'Thank you for testing!'
  }

  const result = await fastify.mailer(mailOptions)

  t.equal(result.accepted.length, 1)
})
