import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
export function Quantity({
  value,
  onMinus,
  onPlus,
  disabled,
}: {
  value: number;
  onMinus: () => void;
  onPlus: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="quantity-control">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        aria-label="Remove one"
        onClick={onMinus}
      >
        <Minus size={14} />
      </Button>
      <span aria-live="polite">{value}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled || value >= 20}
        aria-label="Add one"
        onClick={onPlus}
      >
        <Plus size={14} />
      </Button>
    </div>
  );
}
