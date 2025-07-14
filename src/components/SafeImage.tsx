import React, { useState, useEffect } from 'react';
import { Image, Alert } from 'antd';
import { convertFileSrc } from '@tauri-apps/api/tauri';

interface SafeImageProps {
  src: string;
  alt: string;
  style?: React.CSSProperties;
  maxWidth?: string;
  maxHeight?: string;
}

const SafeImage: React.FC<SafeImageProps> = ({ 
  src, 
  alt, 
  style, 
  maxWidth = '100%', 
  maxHeight = '200px' 
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 使用 convertFileSrc 转换路径
        const convertedSrc = convertFileSrc(src);
        setImageSrc(convertedSrc);
        setLoading(false);
      } catch (err) {
        console.error('Error converting file src:', err);
        setError(`路径转换错误: ${err}`);
        setLoading(false);
      }
    };

    if (src) {
      loadImage();
    }
  }, [src]);

  const handleImageError = (e: any) => {
    console.error('Image load error:', e);
    console.error('Failed to load image from:', imageSrc);
    setError(`图片加载失败: ${src}`);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: maxHeight,
        backgroundColor: '#f5f5f5'
      }}>
        加载中...
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="图片加载失败"
        description={error}
        type="error"
        showIcon
        style={{ margin: '10px 0' }}
      />
    );
  }

  return (
    <Image
      src={imageSrc}
      alt={alt}
      style={{
        maxWidth,
        maxHeight,
        ...style
      }}
      preview={false}
      fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmNWY1ZjUiLz4KICA8cGF0aCBkPSJNNjcuNSAxMTJjLTUuNSAwLTEwLTQuNS0xMC0xMHM0LjUtMTAgMTAtMTAgMTAgNC41IDEwIDEwLTQuNSAxMC0xMCAxMHptMzMuNS0xMGMtMTEgMC0yMC05LTIwLTIwczktMjAgMjAtMjAgMjAgOSAyMCAyMC05IDIwLTIwIDIwem0zMy41LTEwYy01LjUgMC0xMC00LjUtMTAtMTBzNC41LTEwIDEwLTEwIDEwIDQuNSAxMCAxMC00LjUgMTAtMTAgMTB6IiBmaWxsPSIjZGRkIi8+CiAgPHRleHQgeD0iMTAwIiB5PSIxMzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCI+5peg5rOV5Yqg6L295Zu+54mHPC90ZXh0Pgo8L3N2Zz4K"
      onError={handleImageError}
    />
  );
};

export default SafeImage; 