import { Static, Type } from '@sinclair/typebox'
import { zxcvbn } from '@zxcvbn-ts/core'
import argon2 from 'argon2'
import crypto from 'crypto'
import { FastifyPluginAsync } from 'fastify'
import Ajv from 'ajv'

import { config } from '../../../config'
import { verificationInsert } from '../auth/query'
import {
  userDeleteById,
  userInsert,
  userSelect,
  userSelectByEmail,
  userSelectById,
  userSelectByUsername,
  userUpdateById,
  userUpdateProfileById
} from './query'

const User = Type.Object({
  created: Type.String(),
  email: Type.String(),
  first_name: Type.String(),
  id: Type.Number(),
  last_name: Type.String(),
  role: Type.String(),
  username: Type.String(),
  verified: Type.Boolean()
})

const ajv = new Ajv()

const users: FastifyPluginAsync = async (fastify, pOptions): Promise<void> => {
  /**
   * users/:id :: [DELETE]
   */
  const usersDeleteParams = Type.Object({
    id: Type.Number()
  })

  fastify.route<{
    Params: Static<typeof usersDeleteParams>
  }>({
    method: 'DELETE',
    url: '/:id',
    schema: {
      params: usersDeleteParams,
      response: {
        204: {}
      }
    },
    preValidation: async (request, reply) => {
      if (request.isUnauthenticated()) {
        throw fastify.httpErrors.unauthorized()
      }
    },
    handler: async (request, reply) => {
      const id = request.params.id

      await fastify.pg.query(userDeleteById(id))

      reply.code(204)
    }
  })

  /**
   * users :: [GET]
   */
  const usersGetQuerystring = Type.Object({
    limit: Type.Number(),
    offset: Type.Number(),
    sort: Type.String()
  })

  fastify.route<{
    Querystring: Static<typeof usersGetQuerystring>
  }>({
    method: 'GET',
    url: '/',
    schema: {
      querystring: usersGetQuerystring,
      response: {
        200: Type.Object({
          count: Type.String(),
          rows: Type.Array(User)
        })
      }
    },
    preValidation: async (request, reply) => {
      if (request.isUnauthenticated()) {
        throw fastify.httpErrors.unauthorized()
      }
    },
    handler: async (request, reply) => {
      const { limit, offset, sort } = request.query

      const schema = Type.Strict(
        Type.Array(
          Type.Object({
            field: Type.String({
              enum: [
                'id',
                'email',
                'first_name',
                'last_name',
                'role',
                'username',
                'verified'
              ]
            }),
            sort: Type.String({
              enum: ['asc', 'desc']
            })
          })
        )
      )

      const validate = ajv.compile(schema)

      const parsed: Static<typeof schema> = JSON.parse(sort)

      if (!validate(parsed))
        throw fastify.httpErrors.unprocessableEntity('Query invalid')

      const order = parsed
        .map((x: { field: any; sort: any }) => `${x.field} ${x.sort}`)
        .join()

      const users = await fastify.pg.query(
        userSelect(limit, offset * limit, order)
      )

      reply.send(users.rows[0])
    }
  })

  /**
   * users/:id :: [PATCH]
   */
  const usersPatchBody = Type.Object({
    email: Type.String(),
    first_name: Type.String(),
    last_name: Type.String(),
    role: Type.String(),
    username: Type.String()
  })
  const usersPatchParams = Type.Object({
    id: Type.Number()
  })

  fastify.route<{
    Body: Static<typeof usersPatchBody>
    Params: Static<typeof usersPatchParams>
  }>({
    method: 'PATCH',
    url: '/:id',
    schema: {
      body: usersPatchBody,
      params: usersPatchParams,
      response: {
        204: {}
      }
    },
    preValidation: async (request, reply) => {
      if (request.isUnauthenticated()) {
        throw fastify.httpErrors.unauthorized()
      }
    },
    handler: async (request, reply) => {
      const { email, first_name, last_name, role, username } = request.body
      const id = request.params.id
      await fastify.pg.query(
        userUpdateById(email, first_name, id, last_name, role, username)
      )
      reply.code(204)
    }
  })

  /**
   * users :: [POST]
   */
  const usersPostBody = Type.Object({
    email: Type.String(),
    first_name: Type.String(),
    last_name: Type.String(),
    role: Type.String(),
    username: Type.String()
  })

  fastify.route<{
    Body: Static<typeof usersPostBody>
  }>({
    method: 'POST',
    url: '/',
    schema: {
      body: usersPostBody,
      response: {
        204: {}
      }
    },
    preValidation: async (request, reply) => {
      if (request.isUnauthenticated()) {
        throw fastify.httpErrors.unauthorized()
      }
    },
    handler: async (request, reply) => {
      const { email, first_name, last_name, role, username } = request.body

      const userByEmail = await fastify.pg.query(userSelectByEmail(email))
      if (userByEmail.rows.length) {
        throw fastify.httpErrors.conflict('Email already exists')
      }

      const userByUsername = await fastify.pg.query(
        userSelectByUsername(username)
      )
      if (userByUsername.rows.length) {
        throw fastify.httpErrors.conflict('Username already exists')
      }

      const user = await fastify.pg.query(
        userInsert(
          true,
          email,
          first_name ? first_name : null,
          null,
          last_name ? last_name : null,
          role,
          username ? username : null,
          false
        )
      )

      let accountToken = crypto.randomBytes(32).toString('hex')
      let passwordToken = crypto.randomBytes(32).toString('hex')

      await fastify.pg.query(
        verificationInsert(user.rows[0].id, accountToken, '', '')
      )
      await fastify.pg.query(
        verificationInsert(user.rows[0].id, passwordToken, '', '')
      )

      const text = `
        Please verify your account:
        ${config.mail.baseUrl}/verify?userId=${user.rows[0].id}&token=${accountToken}

        Please set your password:
        ${config.mail.baseUrl}/change?userId=${user.rows[0].id}&token=${passwordToken}
      `

      const mailOptions = {
        from: config.mail.transport.auth.user,
        to: email,
        subject: 'STET Solutions :: Set Password and Verify Account',
        text: text
      }
      fastify.mailer(mailOptions)

      reply.code(204)
    }
  })

  /**
   * users/:id/email :: [PATCH]
   */
  const usersEmailPatchBody = Type.Object({
    current_email: Type.String(),
    new_email: Type.String(),
    password: Type.String()
  })
  const usersEmailPatchParams = Type.Object({
    id: Type.Number()
  })

  fastify.route<{
    Body: Static<typeof usersEmailPatchBody>
    Params: Static<typeof usersEmailPatchParams>
  }>({
    method: 'PATCH',
    url: '/:id/email',
    schema: {
      body: usersEmailPatchBody,
      params: usersEmailPatchParams,
      response: {
        204: {}
      }
    },
    preValidation: async (request, reply) => {
      if (request.isUnauthenticated()) {
        throw fastify.httpErrors.unauthorized()
      }
    },
    handler: async (request, reply) => {
      const id = request.params.id
      const { current_email, new_email, password } = request.body

      let mailOptions, text, user

      if (id !== request.user!.id) {
        throw fastify.httpErrors.forbidden('ID invalid')
      }

      user = await fastify.pg.query(userSelectByEmail(new_email))
      if (user.rows.length) {
        throw fastify.httpErrors.forbidden('New email unavailable')
      }

      user = await fastify.pg.query(userSelectByEmail(current_email))
      if (!user.rows.length) {
        throw fastify.httpErrors.forbidden('Current email invalid')
      }

      const authenticated = await argon2.verify(user.rows[0].hash, password)
      if (!authenticated) throw fastify.httpErrors.forbidden('Password invalid')

      const token = crypto.randomBytes(32).toString('hex')

      await fastify.pg.query(
        verificationInsert(user.rows[0].id, token, new_email, '')
      )

      text = `
        Please verify your change of email address:
        ${config.mail.baseUrl}/verify?userId=${user.rows[0].id}&token=${token}
      `

      mailOptions = {
        from: config.mail.transport.auth.user,
        to: new_email,
        subject: 'STET Solutions :: Change Email Address',
        text: text
      }
      fastify.mailer(mailOptions)

      text = `
        A change of email address has been requested. 
        If you did not request this change, please ensure your account is secure.
      `

      mailOptions = {
        from: config.mail.transport.auth.user,
        to: current_email,
        subject: 'STET Solutions :: Change Email Address',
        text: text
      }
      fastify.mailer(mailOptions)

      reply.code(204)
    }
  })

  /**
   * users/:id/password :: [PATCH]
   */
  const usersPasswordPatchBody = Type.Object({
    current_password: Type.String(),
    new_password: Type.String(),
    confirm_password: Type.String()
  })
  const userPasswordPatchParams = Type.Object({
    id: Type.Number()
  })

  fastify.route<{
    Body: Static<typeof usersPasswordPatchBody>
    Params: Static<typeof userPasswordPatchParams>
  }>({
    method: 'PATCH',
    url: '/:id/password',
    schema: {
      body: usersPasswordPatchBody,
      params: userPasswordPatchParams,
      response: {
        204: {}
      }
    },
    preValidation: async (request, reply) => {
      if (request.isUnauthenticated()) {
        throw fastify.httpErrors.unauthorized()
      }
    },
    handler: async (request, reply) => {
      const id = request.params.id
      const { current_password, new_password, confirm_password } = request.body

      if (id !== request.user!.id) {
        throw fastify.httpErrors.forbidden('ID invalid')
      }

      const user = await fastify.pg.query(userSelectById(id))
      const authenticated = await argon2.verify(
        user.rows[0].hash,
        current_password
      )
      if (!authenticated) throw fastify.httpErrors.forbidden('Password invalid')

      const passwordStrength = await zxcvbn(new_password)
      if (passwordStrength.score <= 2) {
        throw fastify.httpErrors.unprocessableEntity('Password insufficient')
      }

      if (new_password !== confirm_password)
        throw fastify.httpErrors.unprocessableEntity('Password mismatched')

      const hash = await argon2.hash(new_password, {
        type: argon2.argon2id
      })

      const token = crypto.randomBytes(32).toString('hex')

      await fastify.pg.query(
        verificationInsert(user.rows[0].id, token, '', hash)
      )

      const text = `
        Please verify your change of password:
        ${config.mail.baseUrl}/verify?userId=${user.rows[0].id}&token=${token}
      `

      const mailOptions = {
        from: config.mail.transport.auth.user,
        to: user.rows[0].email,
        subject: 'STET Solutions :: Change Password',
        text: text
      }
      fastify.mailer(mailOptions)

      reply.code(204)
    }
  })

  /**
   * users/:id/profile :: [PATCH]
   */
  const usersProfilePatchBody = Type.Object({
    first_name: Type.String({ minLength: 1 }),
    last_name: Type.String({ minLength: 1 }),
    username: Type.String({ minLength: 1 })
  })
  const usersProfilePatchParams = Type.Object({
    id: Type.Number()
  })

  fastify.route<{
    Body: Static<typeof usersProfilePatchBody>
    Params: Static<typeof usersProfilePatchParams>
  }>({
    method: 'PATCH',
    url: '/:id/profile',
    schema: {
      body: usersProfilePatchBody,
      params: usersProfilePatchParams,
      response: {
        201: User
      }
    },
    preValidation: async (request, reply) => {
      if (request.isUnauthenticated()) {
        throw fastify.httpErrors.unauthorized()
      }
    },
    handler: async (request, reply) => {
      const id = request.params.id
      const { first_name, last_name, username } = request.body

      if (id !== request.user!.id)
        throw fastify.httpErrors.forbidden('ID invalid')

      const user = await fastify.pg.query(userSelectByUsername(username))
      if (user.rows.length && user.rows[0].id !== request.user!.id) {
        throw fastify.httpErrors.conflict('Username unavailable')
      }

      const result = await fastify.pg.query(
        userUpdateProfileById(first_name, id, last_name, username)
      )
      delete result.rows[0].hash
      delete result.rows[0].verification_code

      reply.send(result.rows[0])
    }
  })
}

export default users
