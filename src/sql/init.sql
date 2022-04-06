DROP SCHEMA public CASCADE;

CREATE SCHEMA public;

CREATE TABLE "user" (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  email text NOT NULL UNIQUE,
  first_name text,
  last_name text,
  role TEXT,
  username text UNIQUE,
  hash TEXT,
  active boolean,
  verified boolean
);

CREATE TABLE "verification" (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  token text NOT NULL,
  email text,
  password TEXT,
  user_id int NOT NULL
);

ALTER TABLE "verification"
  ADD CONSTRAINT role_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE
