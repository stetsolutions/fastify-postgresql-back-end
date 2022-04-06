import SQL from '@nearform/sql'

const verificationDelete = (userId: number, token: string) => {
  return SQL`
    DELETE
    FROM verification
    WHERE user_id = ${userId}
    AND token = ${token}
    RETURNING *
  `
}

const verificationDeleteAllByInterval = () => {
  return SQL`
      DELETE
      FROM verification
      WHERE created < now() - interval '1 hour'
    `
}

const verificationInsert = (
  userId: number,
  token: string,
  email: string,
  password: string
) => {
  return SQL`
    INSERT INTO verification (user_id, token, email, password)
    VALUES ( ${userId}, ${token}, ${email}, ${password} )
    RETURNING *
  `
}

const verificationSelectByInterval = (userId: number, token: string) => {
  return SQL`
    SELECT *
    FROM verification
    WHERE user_id = ${userId}
    AND token = ${token}
    AND created > now() - interval '1 hour'
  `
}

export {
  verificationDelete,
  verificationDeleteAllByInterval,
  verificationInsert,
  verificationSelectByInterval
}
