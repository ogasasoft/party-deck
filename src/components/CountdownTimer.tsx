import { useEffect, useState } from "react";
import { formatClock } from "../core/time";

export function CountdownTimer(props: { seconds: number }) {
  const [remaining, setRemaining] = useState(props.seconds);

  useEffect(() => {
    setRemaining(props.seconds);
    const timerId = window.setInterval(() => {
      setRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [props.seconds]);

  return (
    <div className="timer">
      <span>{formatClock(remaining)}</span>
    </div>
  );
}
