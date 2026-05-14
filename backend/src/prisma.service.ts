import { Injectable, InternalServerErrorException, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appRoot = resolve(__dirname, '..');
const envPath = resolve(appRoot, '.env');
const defaultDatabaseUrl = 'file:./dev.db';
const prismaRoot = resolve(appRoot, 'prisma');
const logger = new Logger('PrismaService');

if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);

    if (!match || process.env[match[1]]) continue;

    process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      datasources: {
        db: {
          url: resolveDatabaseUrl(process.env.DATABASE_URL ?? defaultDatabaseUrl),
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
    await this.assertDatabaseReady();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async assertDatabaseReady() {
    try {
      await this.user.count();
    } catch (error) {
      if (isMissingTableError(error)) {
        logger.error('Database schema is missing. Run "npm run db:init" in the backend workspace before starting the server.');
        throw new InternalServerErrorException(
          '数据库未初始化，缺少数据表。请先在 backend 目录执行 `npm run db:init`。',
        );
      }

      throw error;
    }
  }
}

function resolveDatabaseUrl(databaseUrl: string) {
  if (databaseUrl.startsWith('file:./') || databaseUrl.startsWith('file:../')) {
    const relativePath = databaseUrl.slice('file:'.length);
    return `file:${resolve(prismaRoot, relativePath).replace(/\\/g, '/')}`;
  }

  return databaseUrl;
}

function isMissingTableError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021';
}
