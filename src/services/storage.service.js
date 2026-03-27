import { access, mkdir, rename, unlink } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';

const LOCAL_UPLOAD_ROOT = process.env.LOCAL_UPLOAD_ROOT || 'uploads/files';
const STORAGE_BASE_URL = process.env.STORAGE_PUBLIC_BASE_URL || '';
const USE_RCLONE_UPLOAD = process.env.USE_RCLONE_UPLOAD === 'true';
const RCLONE_REMOTE = process.env.RCLONE_REMOTE || '';
const RCLONE_REMOTE_BASE_PATH = process.env.RCLONE_REMOTE_BASE_PATH || '';

const ensureDir = async (dirPath) => {
  await mkdir(dirPath, { recursive: true });
};

const sanitizeName = (value = '') => value.replace(/[^a-zA-Z0-9._-]/g, '_');

const safeFilename = (originalName = 'file.bin', preserveOriginalName = false) => {
  const base = sanitizeName(path.basename(originalName).replace(/\s+/g, '_'));

  if (preserveOriginalName) {
    return base || `file-${Date.now()}.bin`;
  }

  return `${Date.now()}-${randomUUID()}-${base || 'file.bin'}`;
};

const buildPublicUrl = (relativeFilePath) => {
  if (!STORAGE_BASE_URL) {
    return relativeFilePath;
  }

  const cleanBase = STORAGE_BASE_URL.replace(/\/$/, '');
  return `${cleanBase}/${relativeFilePath.replace(/\\/g, '/')}`;
};

const rcloneCopyToRemote = async (localPath, remotePath) => {
  return new Promise((resolve, reject) => {
    const child = spawn('rclone', ['copyto', localPath, remotePath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `rclone finalizo con codigo ${code}`));
        return;
      }
      resolve();
    });
  });
};

export const saveUploadedFile = async (file, folder = 'clips', options = {}) => {
  if (!file) {
    return null;
  }

  const { preserveOriginalName = false } = options;
  const filename = safeFilename(file.originalname, preserveOriginalName);
  const relativeFilePath = path.join(folder, filename);

  if (USE_RCLONE_UPLOAD) {
    if (!RCLONE_REMOTE) {
      throw new Error('USE_RCLONE_UPLOAD=true pero falta RCLONE_REMOTE');
    }

    try {
      await access(file.path, constants.F_OK);
      const remotePath = `${RCLONE_REMOTE}:${path.posix.join(
        RCLONE_REMOTE_BASE_PATH,
        folder,
        filename,
      )}`;
      await rcloneCopyToRemote(file.path, remotePath);
      return {
        path: relativeFilePath,
        url: buildPublicUrl(relativeFilePath),
        backend: 'rclone',
      };
    } catch (error) {
      throw new Error(`Error subiendo archivo con rclone: ${error.message}`);
    } finally {
      await unlink(file.path).catch(() => null);
    }
  }

  const targetDir = path.join(LOCAL_UPLOAD_ROOT, folder);
  await ensureDir(targetDir);

  const targetPath = path.join(targetDir, filename);
  await rename(file.path, targetPath);

  const publicRelativePath = path.join(folder, filename);
  return {
    path: publicRelativePath,
    url: buildPublicUrl(publicRelativePath),
    backend: 'local',
  };
};
