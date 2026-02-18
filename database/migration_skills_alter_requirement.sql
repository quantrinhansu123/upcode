-- Migration: Alter requirement column from TEXT to JSONB
-- Chạy migration này nếu bảng skills đã tồn tại với requirement là TEXT

-- Check if column exists and is TEXT type, then alter to JSONB
DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'skills') THEN
    -- Check if column is TEXT type
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'skills' 
      AND column_name = 'requirement' 
      AND data_type = 'text'
    ) THEN
      -- Convert empty/null text to NULL, otherwise try to parse as JSON
      ALTER TABLE skills ALTER COLUMN requirement TYPE JSONB USING 
        CASE 
          WHEN requirement IS NULL OR trim(requirement) = '' THEN NULL
          ELSE 
            CASE 
              WHEN requirement::text ~ '^[\s]*\[.*\][\s]*$' THEN requirement::jsonb
              ELSE jsonb_build_array(jsonb_build_object('text', requirement, 'checked', false))
            END
        END;
      
      RAISE NOTICE 'Column requirement đã được chuyển từ TEXT sang JSONB';
    ELSE
      RAISE NOTICE 'Column requirement không phải TEXT type hoặc đã là JSONB';
    END IF;
  ELSE
    RAISE NOTICE 'Bảng skills chưa tồn tại, vui lòng chạy migration_skills.sql trước';
  END IF;
END $$;
