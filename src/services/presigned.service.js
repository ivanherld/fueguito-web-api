import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'node:path';

const STORAGE_BASE_URL = process.env.STORAGE_PUBLIC_BASE_URL || '';

let s3Client = null;

const getS3Client = () => {
  if (s3Client) return s3Client;

  const endpoint = process.env.R2_S3_ENDPOINT_EU || process.env.R2_S3_ENDPOINT || '';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Faltan variables de entorno R2: R2_S3_ENDPOINT_EU, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY',
    );
  }

  s3Client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });

  return s3Client;
};

const sanitizeName = (value = '') => value.replace(/[^a-zA-Z0-9._-]/g, '_');

export const buildUploadKey = ({ folder, filename }) => {
  const safeName = sanitizeName(path.basename(filename).replace(/\s+/g, '_'));
  return `${folder}/${safeName || 'file.bin'}`;
};

export const generateUploadUrl = async ({ key, contentType, expiresIn = 3600 }) => {
  const bucket = process.env.R2_BUCKET_NAME || '';
  if (!bucket) {
    throw new Error('Falta R2_BUCKET_NAME en variables de entorno');
  }

  const client = getS3Client();
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn });

  const cleanBase = STORAGE_BASE_URL.replace(/\/$/, '');
  const publicUrl = cleanBase ? `${cleanBase}/${key}` : key;

  return { uploadUrl, publicUrl, key, expiresIn };
};
