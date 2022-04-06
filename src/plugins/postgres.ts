import fp from 'fastify-plugin'
import fastifyPostgres from 'fastify-postgres'

import { config } from '../config'

export default fp(async (fastify, opts) => {
  const uri = process.env.PG_URI ? process.env.PG_URI : `${config.pg.uri}/${config.pg.database}`

  fastify.register(fastifyPostgres, {
    connectionString: uri
  })
})
