import argon2 from 'argon2'
import Fastify from 'fastify'
import fp from 'fastify-plugin'
import fs from 'fs'
import path from 'path'
import pg from 'pg'
import * as tap from 'tap'

import App from '../src/app'
import { config } from '../src/config'
import { userInsert } from '../src/routes/v1/users/query'
import { verificationInsert } from '../src/routes/v1/auth/query'

export type Test = typeof tap['Test']['prototype']

const build = async (t: Test, tapId?: string) => {
  const fastify = Fastify()
  process.env.PG_URI = `${config.pg.uri}/${config.test.prefix}_${
    tapId ? tapId : '0'
  }`

  await fastify.register(fp(App))
  await fastify.ready()

  return fastify
}

const setupDb = async (tapId?: string) => {
  const { Client } = pg
  const init = fs
    .readFileSync(path.resolve(__dirname, '../src/sql/init.sql'))
    .toString()

  let client
  let connectionString

  const hash = await argon2.hash(config.test.password, {
    type: argon2.argon2id
  })

  connectionString = `${config.pg.uri}`
  client = new Client({ connectionString })

  await client.connect()
  await client.query(
    `DROP DATABASE IF EXISTS ${config.test.prefix}_${tapId ? tapId : '0'}`
  )
  await client.query(
    `CREATE DATABASE ${config.test.prefix}_${tapId ? tapId : '0'}`
  )
  await client.end()

  connectionString = `${config.pg.uri}/${config.test.prefix}_${
    tapId ? tapId : '0'
  }`
  client = new Client({ connectionString })

  await client.connect()
  await client.query(init)
  await client.query(
    userInsert(
      true,
      `${config.test.username}+admin@${config.test.domain}`,
      'baz',
      hash,
      'qux',
      'admin',
      'bazqux',
      false
    )
  )
  await client.query(
    userInsert(
      true,
      `${config.test.username}+user@${config.test.domain}`,
      'foo',
      hash,
      'bar',
      'user',
      'foobar',
      false
    )
  )
  await client.query(verificationInsert(2, '123-account', '', ''))
  await client.query(verificationInsert(2, '123-email', 'foo@bar.com', ''))
  await client.query(
    verificationInsert(2, '123-change-password', '', 'foobarbazqux')
  )
  await client.query(verificationInsert(2, '123-reset-password', '', ''))
  await client.end()
}

const teardownDb = async (tapId?: string) => {
  const { Client } = pg

  const connectionString = config.pg.uri
  const client = new Client({ connectionString })

  await client.connect()
  await client.query(
    `DROP DATABASE ${config.test.prefix}_${tapId ? tapId : '0'}`
  )
  await client.end()
}

const signIn = async (request: any, role?: string) => {
  const email =
    role === 'admin'
      ? `${config.test.username}+admin@${config.test.domain}`
      : `${config.test.username}+user@${config.test.domain}`

  const response = await request
    .post('/api/v1/auth/sign-in')
    .send({ username: email, password: config.test.password })

  return response
}

export { build, setupDb, signIn, teardownDb }
