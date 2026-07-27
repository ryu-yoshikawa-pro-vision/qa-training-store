import { useState } from "react";

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function ProductImage({ src, alt, className }: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`product-image ${className ?? ""}`}>
      <img
        src={failed ? "/images/placeholder.svg" : src}
        alt={failed ? "画像を表示できません" : alt}
        onError={() => setFailed(true)}
      />
      {failed && <span className="product-image__error">画像を表示できません</span>}
    </span>
  );
}
