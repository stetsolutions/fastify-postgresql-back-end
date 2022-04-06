import fp from 'fastify-plugin'
import fastifyHelmet from 'fastify-helmet'

export default fp(async (fastify, opts) => {
  fastify.register(fastifyHelmet, { contentSecurityPolicy: false })
})
