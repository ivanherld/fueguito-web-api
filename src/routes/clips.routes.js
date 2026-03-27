import { Router } from 'express';
import multer from 'multer';
import {
  getAllClips,
  getClipById,
  createClip,
  updateClip,
  deleteClip,
} from '../controllers/clips.controller.js';

const router = Router();

const upload = multer({
  dest: 'uploads/tmp',
  limits: {
    // 2GB por archivo: pensado para clips pesados.
    fileSize: 2 * 1024 * 1024 * 1024,
  },
});

const clipUploadFields = upload.fields([
  { name: 'clip', maxCount: 1 },
  { name: 'url', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
  { name: 'storyboard', maxCount: 1 },
  { name: 'storyboard2', maxCount: 1 },
  { name: 'url_storyboard', maxCount: 1 },
  { name: 'url_storyboard2', maxCount: 1 },
]);

router.get('/clips', getAllClips);
router.get('/clips/:id', getClipById);
router.post('/clips', clipUploadFields, createClip);
router.put('/clips/:id', clipUploadFields, updateClip);
router.patch('/clips/:id', clipUploadFields, updateClip);
router.delete('/clips/:id', deleteClip);

export default router;
