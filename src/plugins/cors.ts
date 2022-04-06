import fastifyCors from 'fastify-cors'
import fp from 'fastify-plugin'
import { config } from '../config'

export default fp(async (fastify, opts) => {
  void fastify.register(fastifyCors, {
    origin: config.cors.origin,
    credentials: true
  })
})
