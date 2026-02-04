import { useState, useRef, useCallback } from 'react';
import { Upload, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { supabase } from '@/lib/supabase';

interface ImageUploadProps {
  label?: string;
  error?: string;
  required?: boolean;
  bucket: string;
  path: string;
  value?: string;
  onChange: (url: string | null) => void;
  className?: string;
  shape?: 'square' | 'circle';
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'w-20 h-20',
  md: 'w-32 h-32',
  lg: 'w-40 h-40',
};

export function ImageUpload({
  label,
  error,
  required,
  bucket,
  path,
  value,
  onChange,
  className,
  shape = 'square',
  size = 'md',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      console.log('[ImageUpload] handleUpload triggered');
      const file = e.target.files?.[0];
      if (!file) {
        console.log('[ImageUpload] No file selected');
        return;
      }

      console.log('[ImageUpload] File selected:', file.name, file.type, file.size);

      if (!file.type.startsWith('image/')) {
        setUploadError('Only image files are allowed.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('File size must be 5MB or less.');
        return;
      }

      setUploading(true);
      setUploadError(null);

      console.log('[ImageUpload] Checking session...');
      // Ensure session is valid before upload
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('[ImageUpload] Session result:', { session: !!session, error: sessionError });

      if (sessionError || !session) {
        setUploadError('Please log in again to upload.');
        setUploading(false);
        return;
      }

      console.log('[ImageUpload] Session valid, starting upload...');

      const ext = file.name.split('.').pop();
      const fileName = `${path}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true });

      if (uploadErr) {
        console.error('Image upload error:', uploadErr);
        setUploadError(`Upload failed: ${uploadErr.message}`);
        setUploading(false);
        return;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
      onChange(data.publicUrl);
      setUploading(false);
    },
    [bucket, path, onChange]
  );

  const handleRemove = useCallback(() => {
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  }, [onChange]);

  const displayError = error || uploadError;

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div
        className={cn(
          'relative border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden bg-background hover:bg-accent transition-colors',
          displayError ? 'border-red-400' : 'border-border',
          shape === 'circle' ? 'rounded-full' : 'rounded-lg',
          sizeMap[size]
        )}
        onClick={() => inputRef.current?.click()}
      >
        {value ? (
          <>
            <img src={value} alt="Upload preview" className="w-full h-full object-cover" />
            <button
              type="button"
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
            >
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center text-muted-foreground">
            {uploading ? (
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            ) : (
              <>
                <Upload className="w-6 h-6 mb-1" />
                <span className="text-xs">Upload</span>
              </>
            )}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
      </div>
      {displayError && <p className="mt-1 text-sm text-red-500">{displayError}</p>}
    </div>
  );
}
