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
    buildings VARCHAR(40)[],
    minigames VARCHAR(40)[],
    tutorials VARCHAR(40)[],
    FOREIGN KEY (username) REFERENCES users.login(username)
);