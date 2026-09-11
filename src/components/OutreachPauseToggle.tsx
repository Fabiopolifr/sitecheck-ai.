"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OutreachPauseToggle({
  initialPaused,
}: {
  initialPaused: boolean;
}) {
  const router = useRouter();
  const [paused, setPaused] = useState(initialPaused);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    try {
      const response = await fetch("/api/admin/outreach/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused: !paused }),
      });
      if (response.ok) {
        setPaused(!paused);
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
        paused
          ? "bg-success/10 text-success hover:bg-success/20"
          : "bg-warning/10 text-warning hover:bg-warning/20"
      }`}
    >
      {paused ? "▶ Riattiva automazione" : "⏸ Metti in pausa"}
    </button>
  );
}
