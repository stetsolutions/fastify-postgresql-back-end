import argon2 from 'argon2'
import fastifyPassport, { Authenticator } from 'fastify-passport'
import fp from 'fastify-plugin'
import fastifySecureSession from 'fastify-secure-session'
import { Strategy as LocalStrategy } from 'passport-local'

import { config } from '../config'
import { userSelectByEmail, userSelectById } from '../routes/v1/users/query'

export default fp(async (fastify, opts) => {
  fastify.register(fastifySecureSession, {
    cookie: {
      path: '/',
      sameSite: 'strict',
      secure: false
    },
    cookieName: config.session.cookie.name,
    key: Buffer.from(config.session.key, 'hex')
  })

  fastify.register(fastifyPassport.initialize())
  fastify.register(fastifyPassport.secureSession())

  fastifyPassport.registerUserSerializer(async (user: any, request) => user.id)

  fastifyPassport.registerUserDeserializer(async (id: number, request) => {
    const user = await fastify.pg.query(userSelectById(id))

    delete user.rows[0].hash
    delete user.rows[0].verification_code

    return user.rows[0]
  })

  fastifyPassport.use(
    'local',
    new LocalStrategy(async function (username, password, done) {
      const user = await fastify.pg.query(userSelectByEmail(username))

      if (!user.rowCount || user.rows[0].hash === null) {
        return done(null, false)
      }

      const authenticated = await argon2.verify(user.rows[0].hash, password)

      if (!authenticated) {
        return done(null, false)
      }

      delete user.rows[0].hash
      delete user.rows[0].verification_code

      return done(null, user.rows[0])
    })
  )

  fastify.decorate('passport', fastifyPassport)
})

declare module 'fastify' {
  export interface FastifyInstance {
    passport: Authenticator
  }

  export interface PassportUser {
    id: number
    created: string
    email: string
    first_name: string
    last_name: string
    role: string
    username: string
    verified: boolean
  }
}
