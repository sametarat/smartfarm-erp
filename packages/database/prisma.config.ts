import { defineConfig } from 'prisma/config'

export default defineConfig({
  datasourceUrl: 'postgresql://smartfarm:smartfarm123@localhost:5432/smartfarm',
  migrations: {
    seed: 'npx tsx ./prisma/seed.ts',
  },
})