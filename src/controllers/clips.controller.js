import * as clipsService from '../services/clips.services.js';
import { generateUploadUrl, generateWorkerUploadUrl, buildUploadKey } from '../services/presigned.service.js';

export const getAllClips = async (req, res) => {
  try {
    const clips = await clipsService.getAllClips({
      filmado: req.query.filmado,
      color: req.query.color,
      decorado: req.query.decorado,
    });
    return res.json({ clips });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getClipById = async (req, res) => {
  try {
    const clip = await clipsService.getClipById(req.params.id);

    if (!clip) {
      return res.status(404).json({ error: 'Clip no encontrado' });
    }

    return res.json(clip);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const createClip = async (req, res) => {
  try {
    const clip = await clipsService.createClip({ body: req.body, files: req.files });
    return res.status(201).json(clip);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const updateClip = async (req, res) => {
  try {
    const updated = await clipsService.updateClip({
      id: req.params.id,
      body: req.body,
      files: req.files,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Clip no encontrado' });
    }

    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const getUploadUrl = async (req, res) => {
  try {
    const { escena, titulo, orden, fileType, filename, contentType } = req.body;

    if (!filename || !contentType) {
      return res.status(400).json({ error: 'filename y contentType son requeridos' });
    }

    const validFileTypes = ['clip', 'thumbnail', 'storyboard', 'storyboard2'];
    if (fileType && !validFileTypes.includes(fileType)) {
      return res.status(400).json({ error: `fileType debe ser: ${validFileTypes.join(', ')}` });
    }

    const folder = clipsService.sceneUploadFolder(
      clipsService.sceneFolder({ escena, titulo, orden }),
    );
    const key = buildUploadKey({ folder, filename });
    const result = process.env.WORKER_URL
      ? generateWorkerUploadUrl({ key, contentType })
      : await generateUploadUrl({ key, contentType });

    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const deleteClip = async (req, res) => {
  try {
    const deleted = await clipsService.deleteClip(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Clip no encontrado' });
    }

    return res.json({ message: 'Clip eliminado', id: req.params.id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
