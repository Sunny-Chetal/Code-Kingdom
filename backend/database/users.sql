CREATE SCHEMA IF NOT EXISTS users;

CREATE TABLE IF NOT EXISTS users.login(
    username VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Student'
);

ALTER TABLE users.login
    ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'Student';

CREATE TABLE IF NOT EXISTS users.stats(
    username VARCHAR(255) PRIMARY KEY,
    gold INT DEFAULT 0,
    gems INT DEFAULT 0,
    wood INT DEFAULT 0,
    buildings VARCHAR(40)[] DEFAULT '{}',
    minigames VARCHAR(40)[] NOT NULL DEFAULT '{}',
    tutorials VARCHAR(40)[] NOT NULL DEFAULT '{}',
    FOREIGN KEY (username) REFERENCES users.login(username)
);

-- Adds tutorial completion storage to databases created before this field existed.
ALTER TABLE users.stats
    ADD COLUMN IF NOT EXISTS tutorials VARCHAR(40)[] NOT NULL DEFAULT '{}';

-- Adds minigame completion storage to databases created before this field existed.
ALTER TABLE users.stats
    ADD COLUMN IF NOT EXISTS minigames VARCHAR(40)[] NOT NULL DEFAULT '{}';

-- Since users.stats was setup before we had all of this finished, not every db had these and it causes issues
-- So they're added here to account
ALTER TABLE users.stats
    ADD COLUMN IF NOT EXISTS gold INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS gems INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS wood INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS buildings VARCHAR(40)[] NOT NULL DEFAULT '{}';