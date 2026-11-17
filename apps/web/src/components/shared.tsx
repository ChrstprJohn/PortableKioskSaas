import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, LoaderCircle, Store } from "lucide-react";
import { useId, type InputHTMLAttributes, type ReactNode } from "react";

export function Mark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <Store size={22} strokeWidth={1.7} />
    </span>
  );
}
export function Field({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const generated = useId();
  const id = props.id || generated;
  return (
    <div className="field">
      <Label htmlFor={id}>{label}</Label>
      <Input
        {...props}
        id={id}
        name={props.name || id}
        aria-describedby={hint ? `${id}-help` : undefined}
      />
      {hint && (
        <p className="hint" id={`${id}-help`}>
          {hint}
        </p>
      )}
    </div>
  );
}
export function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <p className="error-message" role="alert">
      {message}
    </p>
  ) : null;
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Store size={28} strokeWidth={1.3} />
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}
export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="animate-spin" size={18} /> {label}
    </div>
  );
}
export function Status({ value }: { value: string }) {
  return (
    <Badge variant="outline" className={`status status-${value}`}>
      <span className="status-dot" />
      {value.charAt(0).toUpperCase() + value.slice(1)}
    </Badge>
  );
}
export function Heading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a className="text-link" href={href} target="_blank" rel="noreferrer">
      {children}
      <ArrowRight size={14} />
    </a>
  );
}
