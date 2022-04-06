import Fastify from 'fastify'
import Postgres from '../../src/plugins/postgres'
import { test } from 'tap'

test('postgres :: undefined URI', async t => {
  const fastify = Fastify()

  void fastify.register(Postgres)

  await fastify.ready()

  t.equal(process.env.PG_URI, undefined)
})
