import * as clipsModel from '../models/clips.model.js';
import { saveUploadedFile } from './storage.service.js';

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

const sceneFolder = ({ titulo, orden, escena }) => {
  const sceneTitle = buildSceneTitle({ escena, titulo, orden });

  if (!sceneTitle) {
    return 'escena00';
  }

  const token = sceneTitle.replace(/^Escena\s+/i, '').toLowerCase();
  return `escena${token}`;
};

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

  const clipUploaded = await saveUploadedFile(clipFile, `clips/${folderByScene}`, {
    preserveOriginalName: true,
  });
  const thumbnailUploaded = await saveUploadedFile(thumbnailFile, `thumbnails/${folderByScene}`, {
    preserveOriginalName: true,
  });
  const storyboardUploaded = await saveUploadedFile(storyboardFile, `storyboards/${folderByScene}`, {
    preserveOriginalName: true,
  });
  const storyboard2Uploaded = await saveUploadedFile(
    storyboard2File,
    `storyboards/${folderByScene}`,
    { preserveOriginalName: true },
  );

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

  const clipUploaded = await saveUploadedFile(clipFile, `clips/${folderByScene}`, {
    preserveOriginalName: true,
  });
  const thumbnailUploaded = await saveUploadedFile(thumbnailFile, `thumbnails/${folderByScene}`, {
    preserveOriginalName: true,
  });
  const storyboardUploaded = await saveUploadedFile(storyboardFile, `storyboards/${folderByScene}`, {
    preserveOriginalName: true,
  });
  const storyboard2Uploaded = await saveUploadedFile(
    storyboard2File,
    `storyboards/${folderByScene}`,
    { preserveOriginalName: true },
  );

  const nextFilmadoRaw = pickFirstDefined(body.filmado, currentClip.filmado);
  const nextFilmado = parseBoolean(nextFilmadoRaw);
  const nextUrl = pickFirstDefined(clipUploaded?.url, currentClip.url, null);
  const nextStoryboard = pickFirstDefined(
    storyboardUploaded?.url,
    currentClip.url_storyboard,
    null,
  );
  const nextStoryboard2 = pickFirstDefined(
    storyboard2Uploaded?.url,
    currentClip.url_storyboard2,
    null,
  );

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
    ...(clipUploaded ? { url: nextUrl } : {}),
    ...(storyboardUploaded ? { url_storyboard: nextStoryboard } : {}),
    ...(storyboard2Uploaded ? { url_storyboard2: nextStoryboard2 } : {}),
    ...(thumbnailUploaded
      ? { thumbnail: pickFirstDefined(thumbnailUploaded?.url, currentClip.thumbnail, null) }
      : {}),
  };

  const effectiveFilmado = payload.filmado ?? nextFilmado;
  const effectiveUrl = payload.url ?? nextUrl;
  const effectiveStoryboard = payload.url_storyboard ?? nextStoryboard;
  const effectiveStoryboard2 = payload.url_storyboard2 ?? nextStoryboard2;

  validateCreatePayload({
    titulo: payload.titulo ?? currentClip.titulo,
    filmado: effectiveFilmado,
    url: effectiveUrl,
    url_storyboard: effectiveStoryboard,
    url_storyboard2: effectiveStoryboard2,
  });

  if (Object.keys(payload).length === 0) {
    return currentClip;
  }

  return clipsModel.updateClip(id, payload);
};

export const deleteClip = async (id) => {
  return clipsModel.deleteClip(id);
};
