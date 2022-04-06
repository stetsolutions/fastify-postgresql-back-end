import SQL from '@nearform/sql'

const userDeleteById = (id: number) => {
  return SQL`
    DELETE
    FROM "user"
    WHERE id = ${id}
    RETURNING *
  `
}

const userInsert = (
  active: boolean,
  email: string,
  firstName: string | null,
  hash: string | null,
  lastName: string | null,
  role: string,
  username: string | null,
  verified: boolean
) => {
  return SQL`
    INSERT INTO "user" (active, email, first_name, hash, last_name, role, username, verified)
    VALUES (${active}, ${email}, ${firstName}, ${hash}, ${lastName}, ${role}, ${username}, ${verified} )
    RETURNING *
  `
}

const userInsertCredentials = (email: string, hash: string, role: string) => {
  return SQL`
    INSERT INTO "user" (email, hash, role)
    VALUES (${email}, ${hash}, ${role})
    RETURNING *
  `
}

const userSelect = (limit: number, offset: number, order: string) => {
  const orderBy = order.length ? order : `id asc`

  const sql = SQL`
    SELECT
      (SELECT COUNT(*) FROM "user") AS count,
      (SELECT json_agg(t.*) FROM (
          SELECT * FROM "user"
          ORDER BY ${SQL.unsafe(orderBy)}
          LIMIT ${limit}
          OFFSET ${offset}
      ) AS t) AS rows
  `

  return sql
}

const userSelectByEmail = (email: string) => {
  return SQL`
    SELECT *
    FROM "user"
    WHERE email = ${email}
  `
}

const userSelectById = (id: number) => {
  return SQL`
    SELECT *
    FROM "user"
    WHERE id = ${id}
  `
}

const userSelectByUsername = (username: string) => {
  return SQL`
    SELECT *
    FROM "user"
    WHERE username = ${username}
  `
}

const userUpdateById = (
  email: string,
  firstName: string,
  id: number,
  lastName: string,
  role: string,
  username: string
) => {
  return SQL`
    UPDATE "user" 
    SET email = ${email}, first_name = ${firstName}, last_name = ${lastName}, role = ${role}, username = ${username}
    WHERE id = ${id}
    RETURNING *
  `
}

const userUpdateEmailById = (id: number, email: string) => {
  return SQL`
    UPDATE "user" 
    SET email = ${email}
    WHERE id = ${id}
    RETURNING *
  `
}

const userUpdatePasswordById = (id: number, hash: string) => {
  return SQL`
    UPDATE "user" 
    SET hash = ${hash}
    WHERE id = ${id}
    RETURNING *
  `
}

const userUpdateProfileById = (
  firstName: string,
  id: number,
  lastName: string,
  username: string
) => {
  return SQL`
    UPDATE "user" 
    SET first_name = ${firstName}, last_name = ${lastName}, username = ${username}
    WHERE id = ${id}
    RETURNING *
  `
}

const userUpdateVerifiedById = (id: number, verified: boolean) => {
  return SQL`
    UPDATE "user" 
    SET verified = ${verified}
    WHERE id = ${id}
    RETURNING *
  `
}

export {
  userDeleteById,
  userInsert,
  userInsertCredentials,
  userSelect,
  userSelectByEmail,
  userSelectById,
  userSelectByUsername,
  userUpdateById,
  userUpdateEmailById,
  userUpdatePasswordById,
  userUpdateProfileById,
  userUpdateVerifiedById
}
