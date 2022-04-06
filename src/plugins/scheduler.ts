import fp from 'fastify-plugin'
import fastifySchedule from 'fastify-schedule'
import { SimpleIntervalJob, Task } from 'toad-scheduler'

import { verificationDeleteAllByInterval } from '../routes/v1/auth/query'

export default fp(async (fastify, opts) => {
  fastify.register(fastifySchedule)

  const task = new Task('verificationDeleteAllByInterval', () => {
    fastify.pg.query(verificationDeleteAllByInterval())
  })
  const job = new SimpleIntervalJob(
    { hours: 1, runImmediately: true },
    task,
    'id_1'
  )

  fastify.ready().then(() => {
    fastify.scheduler.addSimpleIntervalJob(job)
  })
})
