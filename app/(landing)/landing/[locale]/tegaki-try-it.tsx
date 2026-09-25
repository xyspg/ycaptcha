"use client";

import caveat from "tegaki/fonts/caveat";
import { TegakiRenderer } from "tegaki/react";

export default function TegakiTryIt({ text }: { text: string }) {
  return (
    <TegakiRenderer
      font={caveat}
      time={{ mode: "uncontrolled", loop: true, loopGap: 6 }}
      className="block text-foreground/70 rotate-[-6deg]"
      style={{ fontSize: "1.5rem" }}
    >
      {text}
    </TegakiRenderer>
  );
}
