import fastifyCasbin from 'fastify-casbin'
import fp from 'fastify-plugin'
import { join } from 'path'

export default fp(async (fastify, opts) => {
  fastify.register(fastifyCasbin, {
    model: join(__dirname, '../../src/config/model.conf'),
    adapter: join(__dirname, '../../src/config/policy.csv')
  })

  fastify.addHook('preHandler', async (request, reply) => {
    const role = request.user ? request.user.role : '*'
    const routerPath = request.routerPath
    const method = request.method

    const result = await fastify.casbin.enforce(role, routerPath, method)

    if (!result) {
      throw fastify.httpErrors.forbidden()
    }
  })
})
