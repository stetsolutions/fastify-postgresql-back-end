import { FastifyInstance } from 'fastify'
import { customAlphabet } from 'nanoid'
import supertest from 'supertest'
import { test } from 'tap'

import { build, setupDb, signIn, teardownDb } from '../helper'

const tapId = process.env.TAP_CHILD_ID

const nanoid = customAlphabet('1234567890abcdef', 10)

let fastify: FastifyInstance

test('auth :: setup', async t => {
  await setupDb(tapId)
  fastify = await build(t, tapId)

  t.pass('ready')
})

test('auth :: [DELETE] id invalid', async t => {
  const response = await supertest
    .agent(fastify.server)
    .delete(`/api/v1/auth?userId=1&token=123-account`)

  t.equal(response.status, 404)
})

test('auth :: [DELETE] account', async t => {
  const response = await supertest
    .agent(fastify.server)
    .delete(`/api/v1/auth?userId=2&token=123-account`)

  t.equal(response.status, 204)
})

test('auth :: [DELETE] email', async t => {
  const response = await supertest
    .agent(fastify.server)
    .delete(`/api/v1/auth?userId=2&token=123-email`)

  t.equal(response.status, 204)
})

test('auth :: [DELETE] password', async t => {
  const response = await supertest
    .agent(fastify.server)
    .delete(`/api/v1/auth?userId=2&token=123-change-password`)

  t.equal(response.status, 204)
})

test('auth :: [PATCH] id invalid', async t => {
  const response = await supertest(fastify.server)
    .patch('/api/v1/auth?userId=1&token=123-reset-password')
    .send({
      new_password: fastify.config.test.password,
      confirm_password: fastify.config.test.password
    })

  t.equal(response.status, 404)
})

test('auth :: [PATCH] password insufficient', async t => {
  const response = await supertest(fastify.server)
    .patch('/api/v1/auth?userId=2&token=123-reset-password')
    .send({
      new_password: 'foobar',
      confirm_password: 'foobar'
    })

  t.equal(JSON.parse(response.text).message, 'Password insufficient')
  t.equal(response.status, 422)
})

test('auth :: [PATCH] password mismatched', async t => {
  const response = await supertest(fastify.server)
    .patch('/api/v1/auth?userId=2&token=123-reset-password')
    .send({
      new_password: 'foobarbazqux',
      confirm_password: 'quxbazbarfoo'
    })

  t.equal(JSON.parse(response.text).message, 'Password mismatched')
  t.equal(response.status, 422)
})

test('auth :: [PATCH]', async t => {
  const response = await supertest(fastify.server)
    .patch('/api/v1/auth?userId=2&token=123-reset-password')
    .send({
      new_password: fastify.config.test.password,
      confirm_password: fastify.config.test.password
    })

  t.equal(response.status, 204)
})

test('auth :: [POST]', async t => {
  const response = await supertest(fastify.server)
    .post('/api/v1/auth')
    .send({
      email: `${fastify.config.test.username}+${nanoid()}@${fastify.config.test.domain}`,
      password: fastify.config.test.password
    })

  t.equal(response.status, 204)
})

test('auth :: [POST] account active', async t => {
  const response = await supertest(fastify.server)
    .post('/api/v1/auth')
    .send({
      email: `${fastify.config.test.username}+admin@${fastify.config.test.domain}`,
      password: fastify.config.test.password
    })

  t.equal(response.status, 204)
})

test('auth :: [POST] email exists', async t => {
  const response = await supertest(fastify.server)
    .post('/api/v1/auth')
    .send({
      email: `${fastify.config.test.username}+user@${fastify.config.test.domain}`,
      password: fastify.config.test.password
    })

  t.equal(response.status, 204)
})

test('auth :: [POST] password insufficient', async t => {
  const response = await supertest(fastify.server)
    .post('/api/v1/auth')
    .send({
      email: `${fastify.config.test.username}+${nanoid()}@${fastify.config.test.domain}`,
      password: 'foobar'
    })

  t.equal(response.status, 422)
})

test('auth/resend :: [POST]', async t => {
  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'user')

  const response = await t.context.request.post('/api/v1/auth/resend').send({
    email: `${fastify.config.test.username}+admin@${fastify.config.test.domain}`
  })

  t.equal(response.status, 204)
})

test('auth/resend :: [POST] account active', async t => {
  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'user')

  const response = await t.context.request.post('/api/v1/auth/resend').send({
    email: `${fastify.config.test.username}+admin@${fastify.config.test.domain}`
  })

  t.equal(response.status, 204)
})

test('auth/resend :: [POST] email exists', async t => {
  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'user')

  const response = await t.context.request.post('/api/v1/auth/resend').send({
    email: `${fastify.config.test.username}+user@${fastify.config.test.domain}`
  })

  t.equal(response.status, 204)
})

test('auth/reset :: [POST]', async t => {
  const response = await supertest(fastify.server)
    .post('/api/v1/auth/reset')
    .send({ email: `${fastify.config.test.username}+user@${fastify.config.test.domain}` })

  t.equal(response.status, 204)
})

test('auth/reset :: [POST] email nonexistent', async t => {
  const response = await supertest(fastify.server)
    .post('/api/v1/auth/reset')
    .send({ email: `${fastify.config.test.username}+${nanoid()}@${fastify.config.test.domain}` })

  t.equal(response.status, 204)
})

test('auth/sign-in :: [POST]', async t => {
  const testEmail = `${fastify.config.test.username}+${nanoid()}@${fastify.config.test.domain}`

  let response

  response = await supertest(fastify.server)
    .post('/api/v1/auth')
    .send({
      email: testEmail,
      password: fastify.config.test.password
    })

  t.equal(response.status, 204)

  response = await supertest(fastify.server)
    .post('/api/v1/auth/sign-in')
    .send({ username: testEmail, password: fastify.config.test.password })

  t.equal(response.status, 200)
})

test('auth/sign-in :: [POST] password invalid', async t => {
  const response = await supertest(fastify.server)
    .post('/api/v1/auth/sign-in')
    .send({
      username: `${fastify.config.test.username}+user@${fastify.config.test.domain}`,
      password: nanoid()
    })

  t.equal(response.status, 401)
})

test('auth/sign-in :: [POST] username invalid', async t => {
  const response = await supertest(fastify.server)
    .post('/api/v1/auth/sign-in')
    .send({ username: nanoid(), password: fastify.config.test.password })

  t.equal(response.status, 401)
})

test('auth/sign-out :: [POST]', async t => {
  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request)

  const response = await t.context.request.delete('/api/v1/auth/sign-out')

  t.equal(response.status, 204)
})

test('auth :: teardown', async t => {
  await fastify.close()
  await teardownDb(tapId)

  t.pass('done')
})
