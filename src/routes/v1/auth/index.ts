import { Static, Type } from '@sinclair/typebox'
import { zxcvbn } from '@zxcvbn-ts/core'
import argon2 from 'argon2'
import crypto from 'crypto'
import { FastifyPluginAsync } from 'fastify'
import { config } from '../../../config'
import {
  userInsertCredentials,
  userSelectByEmail,
  userUpdateEmailById,
  userUpdatePasswordById,
  userUpdateVerifiedById
} from '../users/query'
import {
  verificationDelete,
  verificationInsert,
  verificationSelectByInterval
} from './query'

const auth: FastifyPluginAsync = async (fastify): Promise<void> => {
  /**
   * auth :: [DELETE]
   */
  const authDeleteQuerystring = Type.Object({
    userId: Type.String(),
    token: Type.String()
  })

  fastify.route<{
    Querystring: Static<typeof authDeleteQuerystring>
  }>({
    method: 'DELETE',
    url: '/',
    schema: {
      querystring: authDeleteQuerystring,
      response: {}
    },
    handler: async (request, reply) => {
      const { userId, token } = request.query

      const verification = await fastify.pg.query(
        verificationSelectByInterval(Number(userId), token)
      )

      if (!verification.rows.length) {
        throw fastify.httpErrors.notFound()
      }

      if (verification.rows[0].email.length) {
        await fastify.pg.query(
          userUpdateEmailById(Number(userId), verification.rows[0].email)
        )
      } else if (verification.rows[0].password.length) {
        await fastify.pg.query(
          userUpdatePasswordById(Number(userId), verification.rows[0].password)
        )
      } else {
        await fastify.pg.query(userUpdateVerifiedById(Number(userId), true))
      }

      await fastify.pg.query(verificationDelete(Number(userId), token))

      reply.code(204)
    }
  })

  /**
   * auth :: [PATCH]
   */
  const authPatchBody = Type.Object({
    new_password: Type.String(),
    confirm_password: Type.String()
  })
  const authPatchQuerystring = Type.Object({
    userId: Type.String(),
    token: Type.String()
  })

  fastify.route<{
    Body: Static<typeof authPatchBody>
    Querystring: Static<typeof authPatchQuerystring>
  }>({
    method: 'PATCH',
    url: '/',
    schema: {
      body: authPatchBody,
      querystring: authPatchQuerystring,
      response: {
        201: {}
      }
    },
    handler: async (request, reply) => {
      const { userId, token } = request.query
      const { new_password, confirm_password } = request.body

      const verification = await fastify.pg.query(
        verificationSelectByInterval(Number(userId), token)
      )
      if (!verification.rows.length) {
        throw fastify.httpErrors.notFound()
      }

      const passwordStrength = await zxcvbn(new_password)
      if (passwordStrength.score <= 2) {
        throw fastify.httpErrors.unprocessableEntity('Password insufficient')
      }

      if (new_password !== confirm_password)
        throw fastify.httpErrors.unprocessableEntity('Password mismatched')

      const hash = await argon2.hash(new_password, {
        type: argon2.argon2id
      })

      await fastify.pg.query(userUpdatePasswordById(Number(userId), hash))

      await fastify.pg.query(verificationDelete(Number(userId), token))

      reply.code(204)
    }
  })

  /**
   * auth :: [POST]
   */
  const authPostBody = Type.Object({
    email: Type.String({ format: 'email' }),
    password: Type.String()
  })

  fastify.route<{
    Body: Static<typeof authPostBody>
  }>({
    method: 'POST',
    url: '/',
    schema: {
      body: authPostBody,
      response: {
        204: {}
      }
    },
    handler: async (request, reply) => {
      const { email, password } = request.body
      let text

      const passwordStrength = await zxcvbn(password)
      if (passwordStrength.score <= 2) {
        throw fastify.httpErrors.unprocessableEntity('Password insufficient')
      }

      const user = await fastify.pg.query(userSelectByEmail(email))
      if (user.rows.length) {
        text = 'This account is active.'
      } else {
        const hash = await argon2.hash(password, { type: argon2.argon2id })
        const user = await fastify.pg.query(
          userInsertCredentials(email, hash, 'user')
        )

        let token = crypto.randomBytes(32).toString('hex')

        await fastify.pg.query(
          verificationInsert(user.rows[0].id, token, '', '')
        )

        text = `
          Please verify your account:
          ${config.mail.baseUrl}/verify?userId=${user.rows[0].id}&token=${token}
        `
      }

      const mailOptions = {
        from: config.mail.transport.auth.user,
        to: email,
        subject: 'STET Solutions :: Verify Account',
        text: text
      }
      fastify.mailer(mailOptions)

      reply.code(204)
    }
  })

  /**
   * auth/resend :: [POST]
   */
  const authResendPostBody = Type.Object({
    email: Type.String({ format: 'email' })
  })

  fastify.route<{
    Body: Static<typeof authResendPostBody>
  }>({
    method: 'POST',
    url: '/resend',
    schema: {
      body: authResendPostBody,
      response: {
        204: {}
      }
    },
    handler: async (request, reply) => {
      const { email } = request.body

      const user = await fastify.pg.query(userSelectByEmail(email))

      let token = crypto.randomBytes(32).toString('hex')

      await fastify.pg.query(verificationInsert(user.rows[0].id, token, '', ''))

      const text = `
          Please verify your account:
          ${config.mail.baseUrl}/verify?userId=${user.rows[0].id}&token=${token}
        `

      const mailOptions = {
        from: config.mail.transport.auth.user,
        to: email,
        subject: 'STET Solutions :: Verify Account',
        text: text
      }
      fastify.mailer(mailOptions)

      reply.code(204)
    }
  })

  /**
   * auth/reset :: [POST]
   */
  const authResetPostBody = Type.Object({
    email: Type.String({ format: 'email' })
  })

  fastify.route<{
    Body: Static<typeof authResetPostBody>
  }>({
    method: 'POST',
    url: '/reset',
    schema: {
      body: authResetPostBody,
      response: {
        204: {}
      }
    },
    handler: async (request, reply) => {
      const { email } = request.body

      const user = await fastify.pg.query(userSelectByEmail(email))

      if (user.rows.length) {
        let token = crypto.randomBytes(32).toString('hex')

        await fastify.pg.query(
          verificationInsert(user.rows[0].id, token, '', '')
        )

        const text = `
        Please reset your password:
        ${config.mail.baseUrl}/change?userId=${user.rows[0].id}&token=${token}
      `

        const mailOptions = {
          from: config.mail.transport.auth.user,
          to: email,
          subject: 'STET Solutions :: Reset Password',
          text: text
        }
        fastify.mailer(mailOptions)
      }

      reply.code(204)
    }
  })

  /**
   * auth/sign-in :: [POST]
   */
  fastify.route({
    method: 'POST',
    url: '/sign-in',
    preValidation: fastify.passport.authenticate('local'),
    handler: async (request, reply) => {
      reply.send(request.user)
    }
  })

  /**
   * auth/sign-out :: [DELETE]
   */
  fastify.route({
    method: 'DELETE',
    url: '/sign-out',
    schema: {
      response: {
        204: {}
      }
    },
    handler: async (request, reply) => {
      request.logOut()

      reply.code(204)
    }
  })
}

export default auth
