# fastify-postgresql-back-end

Back-end starter using:

- Fastify 3
- Nodemailer 6
- PostgreSQL 14
- TypeBox
- TypeScript 4
- fastify-casbin 2
- fastify-passport
- fastify-secure-session 3
- zxcvbn-ts

Compatible with:
 
- [react-cra-mui-front-end](https://github.com/stetsolutions/react-cra-mui-front-end)

## Install

    npm i

## Configure

- Add environment file (i.e. `.env`) using template (i.e. [`.env.template`](https://github.com/stetsolutions/fastify-postgresql-back-end/blob/main/.env.template)).
- [Initialize database](https://github.com/stetsolutions/fastify-postgresql-back-end/blob/main/src/sql/init.sql) (if not running via Docker). 

## Test

    npm test

## Run

### Development

    npm run dev

### Production

    npm start

### Docker

    npm run compose
