import fp from 'fastify-plugin'

import { config } from '../config'

type Config = typeof config

export default fp(async (fastify, opts) => {
  fastify.decorate('config', config)
})

declare module 'fastify' {
  export interface FastifyInstance {
    config: Config
  }
}
