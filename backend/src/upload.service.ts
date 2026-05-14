import { BadRequestException, Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { extname, resolve } from 'node:path';

const uploadRoot = resolve(__dirname, '..', 'uploads');
const maxAvatarSize = 2 * 1024 * 1024;
const avatarRetentionMs = 7 * 24 * 60 * 60 * 1000;
const allowedMimeTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);

@Injectable()
export class UploadService {
  private readonly avatarDir = resolve(uploadRoot, 'avatars');

  saveAvatar(file: Express.Multer.File | undefined, requestOrigin?: string) {
    if (!file) {
      throw new BadRequestException('请选择要上传的头像图片');
    }

    if (!allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('头像仅支持 JPG、PNG、WEBP 或 GIF 格式');
    }

    if (file.size > maxAvatarSize) {
      throw new BadRequestException('头像图片不能超过 2MB');
    }

    this.ensureAvatarDir();
    this.cleanupExpiredAvatars();

    const fallbackExt = extname(file.originalname).toLowerCase();
    const ext = allowedMimeTypes.get(file.mimetype) ?? fallbackExt;
    const filename = `${Date.now()}-${randomUUID()}${ext}`;
    const relativeUrl = `/uploads/avatars/${filename}`;

    writeFileSync(resolve(this.avatarDir, filename), file.buffer);

    return this.toAbsoluteUrl(relativeUrl, requestOrigin);
  }

  deletePreviousAvatar(avatarUrl?: string | null) {
    if (!avatarUrl) return;

    const filename = this.extractAvatarFilename(avatarUrl);
    if (!filename) return;

    const filePath = resolve(this.avatarDir, filename);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  private ensureAvatarDir() {
    if (!existsSync(this.avatarDir)) {
      mkdirSync(this.avatarDir, { recursive: true });
    }
  }

  private cleanupExpiredAvatars() {
    if (!existsSync(this.avatarDir)) {
      return;
    }

    const now = Date.now();
    for (const entry of readdirSync(this.avatarDir)) {
      const filePath = resolve(this.avatarDir, entry);
      const fileStat = statSync(filePath, { throwIfNoEntry: false });

      if (!fileStat?.isFile()) {
        continue;
      }

      if (now - fileStat.mtimeMs > avatarRetentionMs) {
        rmSync(filePath, { force: true });
      }
    }
  }

  private toAbsoluteUrl(relativeUrl: string, requestOrigin?: string) {
    if (!requestOrigin) {
      return relativeUrl;
    }

    return `${requestOrigin}${relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`}`;
  }

  private extractAvatarFilename(avatarUrl: string) {
    try {
      const pathname = avatarUrl.startsWith('http') ? new URL(avatarUrl).pathname : avatarUrl;
      const match = pathname.match(/\/uploads\/avatars\/([^/?#]+)$/);
      return match?.[1] ?? null;
    } catch {
      return null;
    }
  }
}
