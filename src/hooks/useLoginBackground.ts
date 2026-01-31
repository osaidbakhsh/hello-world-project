import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import defaultBg from '@/assets/login-background-dark.jpg';

const BUCKET = 'branding';
const PATH = 'login-background.jpg';

export function useLoginBackground() {
  const [url, setUrl] = useState<string>(defaultBg);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Check if a custom background exists
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(PATH);
        if (data?.publicUrl) {
          // Validate if the file actually exists by trying to fetch headers
          const res = await fetch(data.publicUrl, { method: 'HEAD' });
          if (res.ok) {
            setUrl(data.publicUrl);
          }
        }
      } catch (e) {
        console.error('Failed to load custom login background:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const uploadBackground = useCallback(async (file: File): Promise<boolean> => {
    const { error } = await supabase.storage.from(BUCKET).upload(PATH, file, {
      upsert: true,
      cacheControl: '3600',
      contentType: file.type,
    });

    if (error) {
      console.error('Upload error:', error);
      return false;
    }

    // Refresh URL with cache buster
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(PATH);
    if (data?.publicUrl) {
      setUrl(`${data.publicUrl}?t=${Date.now()}`);
    }
    return true;
  }, []);

  return { backgroundUrl: url, isLoading, uploadBackground };
}
