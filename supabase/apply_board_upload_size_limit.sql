-- Allow church album and board videos up to 200MB.
-- Images are resized before storage, so this mainly raises the video cap.
-- The project-wide Storage file size limit must be at least this value.

UPDATE storage.buckets
SET file_size_limit = 209715200
WHERE id = 'board-uploads';
