import { getSupabaseClient } from './supabase.js';

const tableName = process.env.SUPABASE_CLIPS_TABLE || 'movie_clips';

export const getAllClips = async ({ filmado, color, decorado } = {}) => {
  const supabase = getSupabaseClient();
  let query = supabase.from(tableName).select('*').order('orden', { ascending: true });

  if (filmado !== undefined) {
    const parsedFilmado =
      typeof filmado === 'string' ? filmado.toLowerCase() === 'true' : Boolean(filmado);
    query = query.eq('filmado', parsedFilmado);
  }

  if (color) {
    query = query.eq('color', color);
  }

  if (decorado) {
    query = query.eq('decorado', decorado);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error al obtener clips: ${error.message}`);
  }

  return data || [];
};

export const getClipById = async (id) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from(tableName).select('*').eq('id', id).maybeSingle();

  if (error) {
    throw new Error(`Error al obtener clip ${id}: ${error.message}`);
  }

  return data;
};

export const getClipByScene = async ({ titulo, orden }) => {
  const supabase = getSupabaseClient();
  let query = supabase.from(tableName).select('*');

  const hasTitulo = titulo !== undefined && titulo !== null && titulo !== '';
  const hasOrden = orden !== undefined && orden !== null;

  if (!hasTitulo && !hasOrden) {
    throw new Error('Debes enviar titulo u orden para identificar la escena');
  }

  if (hasTitulo) {
    query = query.eq('titulo', titulo);
  }

  if (hasOrden) {
    query = query.eq('orden', orden);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`Error al buscar escena: ${error.message}`);
  }

  return data;
};

export const createClip = async (clipData) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from(tableName).insert(clipData).select('*').single();

  if (error) {
    throw new Error(`Error al crear clip: ${error.message}`);
  }

  return data;
};

export const updateClip = async (id, patchData) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(tableName)
    .update(patchData)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(`Error al actualizar clip ${id}: ${error.message}`);
  }

  return data;
};

export const deleteClip = async (id) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new Error(`Error al eliminar clip ${id}: ${error.message}`);
  }

  return data;
};
