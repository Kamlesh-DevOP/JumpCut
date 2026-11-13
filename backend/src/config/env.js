import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const configDirectory = path.dirname(fileURLToPath(import.meta.url));

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'TMDB_API_KEY'];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  tmdbApiKey: process.env.TMDB_API_KEY,
  tmdbBaseUrl: process.env.TMDB_BASE_URL ?? 'https://api.themoviedb.org/3',
  tmdbImageBaseUrl: process.env.TMDB_IMAGE_BASE_URL ?? 'https://image.tmdb.org/t/p/w500',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  puzzleCronSecret: process.env.PUZZLE_CRON_SECRET ?? '',
  puzzlePythonBin: process.env.PUZZLE_PYTHON_BIN ?? (process.platform === 'win32' ? 'python' : 'python3'),
  pipelineDirectory: process.env.PIPELINE_DIRECTORY ?? path.resolve(configDirectory, '../../../pipeline')
};
