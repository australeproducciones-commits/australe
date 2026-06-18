import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type PublicButtonVariant = "primary" | "outline" | "ghost";
type PublicButtonSize = "sm" | "md" | "lg" | "xl";

const variantStyles: Record<PublicButtonVariant, string> = {
  primary: "public-btn-primary",
  outline: "public-btn-outline",
  ghost: "public-btn-ghost",
};

const sizeStyles: Record<PublicButtonSize, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-base",
  xl: "px-10 py-5 text-lg font-bold",
};

type PublicButtonBaseProps = {
  variant?: PublicButtonVariant;
  size?: PublicButtonSize;
  className?: string;
  children: React.ReactNode;
};

type PublicButtonAsButton = PublicButtonBaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type PublicButtonAsLink = PublicButtonBaseProps &
  Omit<React.ComponentProps<typeof Link>, "className"> & {
    href: string;
  };

export type PublicButtonProps = PublicButtonAsButton | PublicButtonAsLink;

export function PublicButton({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: PublicButtonProps) {
  const styles = cn(
    "inline-flex items-center justify-center rounded-2xl font-semibold transition disabled:pointer-events-none disabled:opacity-50",
    variantStyles[variant],
    sizeStyles[size],
    className,
  );

  if ("href" in props && props.href) {
    const { href, ...linkProps } = props;
    return (
      <Link href={href} className={styles} {...linkProps}>
        {children}
      </Link>
    );
  }

  const buttonProps = props as PublicButtonAsButton;
  return (
    <button type="button" className={styles} {...buttonProps}>
      {children}
    </button>
  );
}
