import { FastifyInstance } from 'fastify'
import { customAlphabet } from 'nanoid'
import supertest from 'supertest'
import { test } from 'tap'

import { build, setupDb, signIn, teardownDb } from '../helper'

const tapId = process.env.TAP_CHILD_ID

const nanoid = customAlphabet('1234567890abcdef', 10)

let fastify: FastifyInstance

test('users :: setup', async t => {
  await setupDb(tapId)
  fastify = await build(t, tapId)

  t.pass('ready')
})

test('users/:id :: [DELETE]', async t => {
  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'admin')

  const response = await t.context.request.delete('/api/v1/users/3')

  t.equal(response.status, 204)
})

test('users/:id :: [DELETE] unauthenticated', async t => {
  const response = await supertest
    .agent(fastify.server)
    .delete('/api/v1/users/3')

  t.equal(response.status, 401)
})

test('users/:id :: [DELETE] unprivileged', async t => {
  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'user')

  const response = await t.context.request.delete('/api/v1/users/3')

  t.equal(response.status, 403)
})

test('users :: [GET] ', async t => {
  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'admin')

  const response = await t.context.request.get(
    '/api/v1/users?limit=5&offset=0&sort=[{"field":"id","sort":"asc"}]'
  )

  t.equal(response.status, 200)
})

test('users :: [GET] orderless', async t => {
  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'admin')

  const response = await t.context.request.get(
    '/api/v1/users?limit=5&offset=0&sort=[]'
  )

  t.equal(response.status, 200)
})

test('users :: [GET] invalid', async t => {
  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'admin')

  const response = await t.context.request.get(
    '/api/v1/users?limit=5&offset=0&sort=[{"field":"foo","sort":"bar"}]'
  )

  t.equal(response.status, 422)
})

test('users :: [GET] unathenticated', async t => {
  const response = await supertest
    .agent(fastify.server)
    .get('/api/v1/users?limit=5&offset=0&sort=[{"field":"id","sort":"asc"}]')

  t.equal(response.status, 401)
})

test('users :: [GET] unprivileged', async t => {
  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'user')

  const response = await t.context.request.get(
    '/api/v1/users?limit=5&offset=0&sort=[{"field":"id","sort":"asc"}]'
  )

  t.equal(response.status, 403)
})

test('users/:id :: [PATCH]', async t => {
  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'admin')

  const response = await t.context.request.patch('/api/v1/users/2').send({
    email: `${fastify.config.test.username}+user@${fastify.config.test.domain}`,
    first_name: nanoid(),
    last_name: nanoid(),
    role: 'user',
    username: nanoid()
  })

  t.equal(response.status, 204)
})

test('users/:id :: [PATCH] unauthenticated', async t => {
  const response = await supertest
    .agent(fastify.server)
    .patch('/api/v1/users/2')
    .send({
      email: `${fastify.config.test.username}+user@${fastify.config.test.domain}`,
      first_name: nanoid(),
      last_name: nanoid(),
      role: 'user',
      username: nanoid()
    })

  t.equal(response.status, 401)
})

test('users/:id :: [PATCH] unprivileged', async t => {
  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'user')

  const response = await t.context.request.patch('/api/v1/users/2').send({
    email: `${fastify.config.test.username}+user@${fastify.config.test.domain}`,
    first_name: nanoid(),
    last_name: nanoid(),
    role: 'user',
    username: nanoid()
  })

  t.equal(response.status, 403)
})

test('users :: [POST]', async t => {
  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'admin')

  const response = await t.context.request.post('/api/v1/users').send({
    email: `${fastify.config.test.username}+${nanoid()}@${fastify.config.test.domain}`,
    first_name: 'foo',
    last_name: 'bar',
    password: fastify.config.test.password,
    role: 'user',
    username: nanoid()
  })

  t.equal(response.status, 204)
})

test('users :: [POST]', async t => {
  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'admin')

  const response = await t.context.request.post('/api/v1/users').send({
    email: `${fastify.config.test.username}+${nanoid()}@${fastify.config.test.domain}`,
    first_name: '',
    last_name: '',
    password: fastify.config.test.password,
    role: 'user',
    username: ''
  })

  t.equal(response.status, 204)
})

test('users :: [POST] unathenticated', async t => {
  const response = await supertest
    .agent(fastify.server)
    .post('/api/v1/users')
    .send({
      email: `${fastify.config.test.username}+${nanoid()}@${fastify.config.test.domain}`,
      first_name: 'foo',
      last_name: 'bar',
      password: fastify.config.test.password,
      role: 'user',
      username: nanoid()
    })

  t.equal(response.status, 401)
})

test('users :: [POST] unprivileged', async t => {
  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'user')

  const response = await t.context.request.post('/api/v1/users').send({
    email: `${fastify.config.test.username}+${nanoid()}@${fastify.config.test.domain}`,
    first_name: 'foo',
    last_name: 'bar',
    password: fastify.config.test.password,
    role: 'user',
    username: nanoid()
  })

  t.equal(response.status, 403)
})

test('users :: [POST] email exists', async t => {
  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'admin')

  const response = await t.context.request.post('/api/v1/users').send({
    email: `${fastify.config.test.username}+user@${fastify.config.test.domain}`,
    first_name: 'foo',
    last_name: 'bar',
    password: fastify.config.test.password,
    role: 'user',
    username: ''
  })

  t.equal(response.status, 409)
})

test('users :: [POST] username exists', async t => {
  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'admin')

  const response = await t.context.request.post('/api/v1/users').send({
    email: `${fastify.config.test.username}+${nanoid()}@${fastify.config.test.domain}`,
    first_name: 'foo',
    last_name: 'bar',
    password: fastify.config.test.password,
    role: 'user',
    username: 'bazqux'
  })

  t.equal(response.status, 409)
})

test('users/:id/email :: [PATCH]', async t => {
  const testEmail = `${fastify.config.test.username}+${nanoid()}@${fastify.config.test.domain}`

  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'user')

  const response = await t.context.request.patch('/api/v1/users/2/email').send({
    current_email: `${fastify.config.test.username}+user@${fastify.config.test.domain}`,
    new_email: testEmail,
    password: fastify.config.test.password
  })

  await t.context.request.patch('/api/v1/users/2/email').send({
    current_email: testEmail,
    new_email: `${fastify.config.test.username}+user@${fastify.config.test.domain}`,
    password: fastify.config.test.password
  })

  t.equal(response.status, 204)
})

test('users/:id/email :: [PATCH] unauthenticated', async t => {
  const testEmail = `${fastify.config.test.username}+${nanoid()}@${fastify.config.test.domain}`

  const response = await supertest
    .agent(fastify.server)
    .patch('/api/v1/users/2/email')
    .send({
      current_email: `${fastify.config.test.username}+user@${fastify.config.test.domain}`,
      new_email: testEmail,
      password: fastify.config.test.password
    })

  t.equal(response.status, 401)
})

test('users/:id/email :: [PATCH] id invalid', async t => {
  const testEmail = `${fastify.config.test.username}+${nanoid()}@${fastify.config.test.domain}`

  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'user')

  const response = await t.context.request.patch('/api/v1/users/1/email').send({
    current_email: `${fastify.config.test.username}+user@${fastify.config.test.domain}`,
    new_email: testEmail,
    password: fastify.config.test.password
  })

  t.equal(JSON.parse(response.text).message, 'ID invalid')
  t.equal(response.status, 403)
})

test('users/:id/email :: [PATCH] email invalid', async t => {
  const testEmail = `${fastify.config.test.username}+${nanoid()}@${fastify.config.test.domain}`

  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'user')

  const response = await t.context.request.patch('/api/v1/users/2/email').send({
    current_email: `${nanoid()}@${nanoid()}.com`,
    new_email: testEmail,
    password: fastify.config.test.password
  })

  t.equal(JSON.parse(response.text).message, 'Current email invalid')
  t.equal(response.status, 403)
})

test('users/:id/email :: [PATCH] password invalid', async t => {
  const testEmail = `${fastify.config.test.username}+${nanoid()}@${fastify.config.test.domain}`

  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'user')

  const response = await t.context.request.patch('/api/v1/users/2/email').send({
    current_email: `${fastify.config.test.username}+user@${fastify.config.test.domain}`,
    new_email: testEmail,
    password: nanoid()
  })

  t.equal(JSON.parse(response.text).message, 'Password invalid')
  t.equal(response.status, 403)
})

test('users/:id/password :: [PATCH]', async t => {
  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'user')

  const response = await t.context.request
    .patch('/api/v1/users/2/password')
    .send({
      current_password: fastify.config.test.password,
      new_password: fastify.config.test.password,
      confirm_password: fastify.config.test.password
    })

  t.equal(response.status, 204)
})

test('users/:id/password :: [PATCH] unauthenticated', async t => {
  const response = await supertest
    .agent(fastify.server)
    .patch('/api/v1/users/2/password')
    .send({
      current_password: fastify.config.test.password,
      new_password: fastify.config.test.password,
      confirm_password: fastify.config.test.password
    })

  t.equal(response.status, 401)
})

test('users/:id/password :: [PATCH] id invalid', async t => {
  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'user')

  const response = await t.context.request
    .patch('/api/v1/users/1/password')
    .send({
      current_password: fastify.config.test.password,
      new_password: fastify.config.test.password,
      confirm_password: fastify.config.test.password
    })

  t.equal(JSON.parse(response.text).message, 'ID invalid')
  t.equal(response.status, 403)
})

test('users/:id/password :: [PATCH] password invalid', async t => {
  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'user')

  const response = await t.context.request
    .patch('/api/v1/users/2/password')
    .send({
      current_password: nanoid(),
      new_password: fastify.config.test.password,
      confirm_password: fastify.config.test.password
    })

  t.equal(JSON.parse(response.text).message, 'Password invalid')
  t.equal(response.status, 403)
})

test('users/:id/password :: [PATCH] password insufficient', async t => {
  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'user')

  const response = await t.context.request
    .patch('/api/v1/users/2/password')
    .send({
      current_password: fastify.config.test.password,
      new_password: 'foobar',
      confirm_password: 'foobar'
    })

  t.equal(JSON.parse(response.text).message, 'Password insufficient')
  t.equal(response.status, 422)
})

test('users/:id/password :: [PATCH] password mismatched', async t => {
  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'user')

  const response = await t.context.request
    .patch('/api/v1/users/2/password')
    .send({
      current_password: fastify.config.test.password,
      new_password: 'foobarbazqux',
      confirm_password: 'quxbarbazfoo'
    })

  t.equal(JSON.parse(response.text).message, 'Password mismatched')
  t.equal(response.status, 422)
})

test('users/:id/profile :: [PATCH]', async t => {
  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'user')

  const response = await t.context.request
    .patch('/api/v1/users/2/profile')
    .send({
      first_name: nanoid(),
      last_name: nanoid(),
      username: nanoid()
    })

  t.equal(response.status, 200)
})

test('users/:id/profile :: [PATCH] unauthenticated', async t => {
  const response = await supertest
    .agent(fastify.server)
    .patch('/api/v1/users/2/profile')
    .send({
      first_name: nanoid(),
      last_name: nanoid(),
      username: nanoid()
    })

  t.equal(response.status, 401)
})

test('users/:id/profile :: [PATCH] id invalid', async t => {
  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'user')

  const response = await t.context.request
    .patch('/api/v1/users/1/profile')
    .send({
      first_name: nanoid(),
      last_name: nanoid(),
      username: nanoid()
    })

  t.equal(JSON.parse(response.text).message, 'ID invalid')
  t.equal(response.status, 403)
})

test('users/:id/profile :: [PATCH] username unavailble', async t => {
  t.context.request = supertest.agent(fastify.server)

  await signIn(t.context.request, 'user')

  const response = await t.context.request
    .patch('/api/v1/users/2/profile')
    .send({
      first_name: nanoid(),
      last_name: nanoid(),
      username: 'bazqux'
    })

  t.equal(JSON.parse(response.text).message, 'Username unavailable')
  t.equal(response.status, 409)
})

test('users :: teardown', async t => {
  await fastify.close()
  await teardownDb(tapId)

  t.pass('done')
})
