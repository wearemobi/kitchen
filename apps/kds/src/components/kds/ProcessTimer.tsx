import { type ComponentProps } from "react";
import OrderTimer from "./OrderTimer";

type ProcessTimerProps = ComponentProps<typeof OrderTimer>;

export default function ProcessTimer(props: ProcessTimerProps) {
  return (
    <span data-testid="process-timer" className="inline-flex">
      <OrderTimer {...props} />
    </span>
  );
}