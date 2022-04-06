import fp from 'fastify-plugin'
import fastifyRateLimit from 'fastify-rate-limit'

export default fp(async (fastify, opts) => {
  fastify.register(fastifyRateLimit)
})
