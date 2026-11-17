import { Button } from "@/components/ui/button";
import { ShoppingBag, Utensils } from "lucide-react";
export type DiningMode = "dine_in" | "takeout";
export function DiningChoice({
  onChoose,
}: {
  onChoose: (mode: DiningMode) => void;
}) {
  return (
    <section className="dining-choice">
      <h1>How are you joining us?</h1>
      <p>Choose where you’ll enjoy your order.</p>
      <div>
        {(
          [
            {
              value: "dine_in",
              title: "Dine in",
              description: "Stay a while. Enjoy your meal here.",
              icon: Utensils,
            },
            {
              value: "takeout",
              title: "Takeout",
              description: "Your favorites, ready to go.",
              icon: ShoppingBag,
            },
          ] as const
        ).map(({ value, title, description, icon: Icon }) => (
          <Button variant="outline" key={value} onClick={() => onChoose(value)}>
            <Icon size={32} />
            <strong>{title}</strong>
            <span>{description}</span>
          </Button>
        ))}
      </div>
      <small>You can change this before placing your order.</small>
    </section>
  );
}
