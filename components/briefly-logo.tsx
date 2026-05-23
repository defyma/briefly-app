import Image from "next/image";

type BrieflyLogoProps = {
  className?: string;
  imageClassName?: string;
  variant?: "light" | "dark";
};

export function BrieflyLogo({
  className = "",
  imageClassName = "",
  variant = "light",
}: BrieflyLogoProps) {
  return (
    <div className={className}>
      <Image
        alt="Briefly"
        className={imageClassName || "h-10 w-auto"}
        height={400}
        priority
        src={variant === "dark" ? "/briefly-logo-dark.png" : "/briefly-logo.png"}
        width={1600}
      />
    </div>
  );
}
