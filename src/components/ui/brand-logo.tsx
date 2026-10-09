import Image from "next/image";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

export function BrandLogo({
  size = 40,
  className,
  alt = "Gospel Of Truth Mission",
}: {
  size?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <Image
      src={logo}
      alt={alt}
      width={size}
      height={size}
      priority
      className={cn("shrink-0 rounded-lg object-cover", className)}
    />
  );
}