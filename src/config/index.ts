import { envSchema } from 'env-schema'
import S from 'fluent-json-schema'

const schema = S.object()
  .prop('CORS_ORIGIN', S.string().default('*'))
  .prop('MAIL_BASE_URL', S.string().default('http://localhost:3000'))
  .prop('GMAIL_USER', S.string().required())
  .prop(
    'NODE_ENV',
    S.string()
      .enum(['development', 'production', 'testing'])
      .default('production')
  )
  .prop('GMAIL_CLIENT_ID', S.string().required())
  .prop('GMAIL_CLIENT_SECRET', S.string().required())
  .prop('GMAIL_REFRESH_TOKEN', S.string().required())
  .prop('POSTGRES_DB', S.string().required())
  .prop('POSTGRES_HOST', S.string().required())
  .prop('POSTGRES_PASSWORD', S.string().required())
  .prop('POSTGRES_PORT', S.string().required())
  .prop('POSTGRES_USER', S.string().required())
  .prop('SESSION_COOKIE_NAME', S.string().required())
  .prop('SESSION_KEY', S.string().required())
  .prop('TESTING_GMAIL_USER', S.string().required())
  .prop('TESTING_PASSWORD', S.string().required())
  .prop('TESTING_DB_PREFIX', S.string().required())

const env = envSchema({
  dotenv: true,
  schema: schema
})

const config = {
  cors: {
    origin: String(env.CORS_ORIGIN).split(',')
  },
  env: env.NODE_ENV,
  mail: {
    baseUrl: env.MAIL_BASE_URL,
    transport: {
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: env.GMAIL_USER as string,
        clientId: env.GMAIL_CLIENT_ID as string,
        clientSecret: env.GMAIL_CLIENT_SECRET as string,
        refreshToken: env.GMAIL_REFRESH_TOKEN as string
      }
    }
  },
  pg: {
    database: env.POSTGRES_DB as string,
    uri: `postgres://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}`
  },
  session: {
    key: env.SESSION_KEY as string,
    cookie: {
      name: env.SESSION_COOKIE_NAME as string
    }
  },
  test: {
    domain: String(env.TESTING_GMAIL_USER).split("@")[1],
    password: env.TESTING_PASSWORD as string,
    prefix: env.TESTING_DB_PREFIX as string,
    username: String(env.TESTING_GMAIL_USER).split("@")[0],
  }
}

export { config }
