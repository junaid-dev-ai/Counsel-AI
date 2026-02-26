-- CounselAI PostgreSQL Initialization
-- Runs once when the container is first created.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- fuzzy search on contract titles

-- Extensions for full text search (future)
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Verify
SELECT version();
