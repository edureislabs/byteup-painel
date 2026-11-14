import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Lê o arquivo .env da pasta do bot (funciona mesmo se o bot for iniciado de outra pasta).
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
