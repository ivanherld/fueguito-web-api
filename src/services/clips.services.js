import * as clipsModel from '../models/clips.model.js';
import { saveUploadedFile, deleteUploadedFile } from './storage.service.js';

const parseBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }

  return false;
};

const normalizeOrder = (orderValue) => {
  if (orderValue === undefined || orderValue === null || orderValue === '') {
    return null;
  }

  const parsed = Number(orderValue);
  if (Number.isNaN(parsed)) {
    throw new Error('orden debe ser numerico');
  }

  return parsed;
};

const pickFirstDefined = (...values) => values.find((value) => value !== undefined);

const normalizeSceneToken = (sceneValue) => {
  if (sceneValue === undefined || sceneValue === null) {
    return null;
  }

  const token = String(sceneValue).trim().replace(/\s+/g, '').toUpperCase();

  if (!token) {
    return null;
  }

  if (!/^[0-9]+[A-Z]*$/.test(token)) {
    throw new Error('escena debe tener formato como 2, 10, 26A, 26B');
  }

  return token;
};

const extractSceneTokenFromTitle = (titulo) => {
  if (!titulo) {
    return null;
  }

  const match = String(titulo).trim().match(/^Escena\s+([0-9]+[A-Za-z]*)$/i);
  if (!match) {
    return null;
  }

  return normalizeSceneToken(match[1]);
};

const buildSceneTitle = ({ escena, titulo, orden }) => {
  const tokenFromEscena = normalizeSceneToken(escena);
  if (tokenFromEscena) {
    return `Escena ${tokenFromEscena}`;
  }

  const tokenFromTitle = extractSceneTokenFromTitle(titulo);
  if (tokenFromTitle) {
    return `Escena ${tokenFromTitle}`;
  }

  const normalizedOrder = normalizeOrder(orden);
  if (normalizedOrder !== null) {
    return `Escena ${String(normalizedOrder)}`;
  }

  return null;
};

export const sceneFolder = ({ titulo, orden, escena }) => {
  const sceneTitle = buildSceneTitle({ escena, titulo, orden });

  if (!sceneTitle) {
    return 'escena00';
  }

  const token = sceneTitle.replace(/^Escena\s+/i, '').toLowerCase();
  return `escena${token}`;
};

export const sceneUploadFolder = (folderByScene) => `fueguitoweb/clips/${folderByScene}`;

const validateCreatePayload = (payload) => {
  if (!payload.titulo) {
    throw new Error('titulo es requerido');
  }

  if (payload.filmado && !payload.url) {
    throw new Error('Si filmado=true debes subir archivo clip');
  }

  if (!payload.filmado && !payload.url_storyboard && !payload.url_storyboard2) {
    throw new Error('Si filmado=false debes subir storyboard (url_storyboard o url_storyboard2)');
  }

  return payload;
};

export const getAllClips = async ({ filmado, color, decorado } = {}) => {
  return clipsModel.getAllClips({ filmado, color, decorado });
};

export const getClipById = async (id) => {
  return clipsModel.getClipById(id);
};

export const createClip = async ({ body, files }) => {
  const normalizedOrder = normalizeOrder(body.orden);
  const sceneTitle = buildSceneTitle({
    escena: body.escena,
    titulo: body.titulo,
    orden: normalizedOrder,
  });

  if (!sceneTitle) {
    throw new Error('Debes enviar escena (ej: 26A), titulo (Escena XX) u orden');
  }

  const existingScene = await clipsModel.getClipByScene({
    titulo: sceneTitle,
    orden: normalizedOrder,
  });

  if (!existingScene) {
    throw new Error('Escena no encontrada en Supabase');
  }

  const folderByScene = sceneFolder({
    escena: body.escena,
    titulo: existingScene.titulo,
    orden: existingScene.orden,
  });

  const clipFile = files?.clip?.[0] || files?.url?.[0] || null;
  const thumbnailFile = files?.thumbnail?.[0] || null;
  const storyboardFile = files?.storyboard?.[0] || files?.url_storyboard?.[0] || null;
  const storyboard2File = files?.storyboard2?.[0] || files?.url_storyboard2?.[0] || null;
  const uploadFolder = sceneUploadFolder(folderByScene);

  const clipUploaded = await saveUploadedFile(clipFile, uploadFolder, {
    preserveOriginalName: true,
  });
  const thumbnailUploaded = await saveUploadedFile(thumbnailFile, uploadFolder, {
    preserveOriginalName: true,
  });
  const storyboardUploaded = await saveUploadedFile(storyboardFile, uploadFolder, {
    preserveOriginalName: true,
  });
  const storyboard2Uploaded = await saveUploadedFile(storyboard2File, uploadFolder, {
    preserveOriginalName: true,
  });

  const payload = {
    ...(body.filmado !== undefined ? { filmado: parseBoolean(body.filmado) } : {}),
    ...(body.descripcion !== undefined ? { descripcion: body.descripcion } : {}),
    ...(body.color !== undefined ? { color: body.color } : {}),
    ...(body.fecha_aprox !== undefined ? { fecha_aprox: body.fecha_aprox } : {}),
    ...(body.comentarios_filmacion !== undefined
      ? { comentarios_filmacion: body.comentarios_filmacion }
      : {}),
    ...(body.decorado !== undefined ? { decorado: body.decorado } : {}),
    ...(clipUploaded ? { url: clipUploaded.url } : {}),
    ...(storyboardUploaded ? { url_storyboard: storyboardUploaded.url } : {}),
    ...(storyboard2Uploaded ? { url_storyboard2: storyboard2Uploaded.url } : {}),
    ...(thumbnailUploaded ? { thumbnail: thumbnailUploaded.url } : {}),
  };

  const mergedScene = { ...existingScene, ...payload };
  validateCreatePayload(mergedScene);

  const updatedScene = await clipsModel.updateClip(existingScene.id, payload);
  return {
    ...updatedScene,
    mode: existingScene.url ? 'updated' : 'created-entry',
  };
};

export const updateClip = async ({ id, body, files }) => {
  const currentClip = await clipsModel.getClipById(id);

  if (!currentClip) {
    return null;
  }

  const folderByScene = sceneFolder({
    titulo: pickFirstDefined(body.titulo, currentClip.titulo),
    orden: pickFirstDefined(body.orden, currentClip.orden),
  });

  const clipFile = files?.clip?.[0] || files?.url?.[0] || null;
  const thumbnailFile = files?.thumbnail?.[0] || null;
  const storyboardFile = files?.storyboard?.[0] || files?.url_storyboard?.[0] || null;
  const storyboard2File = files?.storyboard2?.[0] || files?.url_storyboard2?.[0] || null;
  const uploadFolder = sceneUploadFolder(folderByScene);

  const clipUploaded = await saveUploadedFile(clipFile, uploadFolder, {
    preserveOriginalName: true,
  });
  const thumbnailUploaded = await saveUploadedFile(thumbnailFile, uploadFolder, {
    preserveOriginalName: true,
  });
  const storyboardUploaded = await saveUploadedFile(storyboardFile, uploadFolder, {
    preserveOriginalName: true,
  });
  const storyboard2Uploaded = await saveUploadedFile(storyboard2File, uploadFolder, {
    preserveOriginalName: true,
  });

  const nextFilmadoRaw = pickFirstDefined(body.filmado, currentClip.filmado);
  const nextFilmado = parseBoolean(nextFilmadoRaw);

  // Para cada campo de archivo:
  // - Si se sube archivo nuevo → usa la URL nueva
  // - Si body.field === null o "" → limpia (borra de storage)
  // - Si body.field === undefined → mantiene el valor actual
  const resolveField = (uploaded, bodyValue, currentValue) => {
    if (uploaded?.url) return uploaded.url;
    if (bodyValue !== undefined) return bodyValue || null;
    return currentValue ?? null;
  };

  const nextUrl = resolveField(clipUploaded, body.url, currentClip.url);
  const nextStoryboard = resolveField(storyboardUploaded, body.url_storyboard, currentClip.url_storyboard);
  const nextStoryboard2 = resolveField(storyboard2Uploaded, body.url_storyboard2, currentClip.url_storyboard2);
  const nextThumbnail = resolveField(thumbnailUploaded, body.thumbnail, currentClip.thumbnail);

  // Archivos viejos a borrar del bucket: cuando se limpia el campo o se reemplaza con distinto nombre
  const oldToDelete = [
    !nextUrl && currentClip.url ? currentClip.url : null,
    !nextStoryboard && currentClip.url_storyboard ? currentClip.url_storyboard : null,
    !nextStoryboard2 && currentClip.url_storyboard2 ? currentClip.url_storyboard2 : null,
    !nextThumbnail && currentClip.thumbnail ? currentClip.thumbnail : null,
    nextUrl && currentClip.url && currentClip.url !== nextUrl ? currentClip.url : null,
    nextStoryboard && currentClip.url_storyboard && currentClip.url_storyboard !== nextStoryboard ? currentClip.url_storyboard : null,
    nextStoryboard2 && currentClip.url_storyboard2 && currentClip.url_storyboard2 !== nextStoryboard2 ? currentClip.url_storyboard2 : null,
    nextThumbnail && currentClip.thumbnail && currentClip.thumbnail !== nextThumbnail ? currentClip.thumbnail : null,
  ].filter(Boolean);

  await Promise.all(oldToDelete.map(deleteUploadedFile));

  const payload = {
    ...(body.titulo !== undefined ? { titulo: body.titulo } : {}),
    ...(body.descripcion !== undefined ? { descripcion: body.descripcion } : {}),
    ...(body.orden !== undefined ? { orden: normalizeOrder(body.orden) } : {}),
    ...(body.filmado !== undefined ? { filmado: nextFilmado } : {}),
    ...(body.color !== undefined ? { color: body.color } : {}),
    ...(body.fecha_aprox !== undefined ? { fecha_aprox: body.fecha_aprox } : {}),
    ...(body.comentarios_filmacion !== undefined
      ? { comentarios_filmacion: body.comentarios_filmacion }
      : {}),
    ...(body.decorado !== undefined ? { decorado: body.decorado } : {}),
    ...(clipUploaded || body.url !== undefined ? { url: nextUrl } : {}),
    ...(storyboardUploaded || body.url_storyboard !== undefined
      ? { url_storyboard: nextStoryboard }
      : {}),
    ...(storyboard2Uploaded || body.url_storyboard2 !== undefined
      ? { url_storyboard2: nextStoryboard2 }
      : {}),
    ...(thumbnailUploaded || body.thumbnail !== undefined ? { thumbnail: nextThumbnail } : {}),
  };

  validateCreatePayload({
    titulo: payload.titulo ?? currentClip.titulo,
    filmado: payload.filmado ?? nextFilmado,
    url: nextUrl,
    url_storyboard: nextStoryboard,
    url_storyboard2: nextStoryboard2,
  });

  if (Object.keys(payload).length === 0) {
    return currentClip;
  }

  return clipsModel.updateClip(id, payload);
};

export const deleteClip = async (id) => {
  return clipsModel.deleteClip(id);
};
