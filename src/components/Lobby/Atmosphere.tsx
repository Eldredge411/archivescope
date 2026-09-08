"use client";

import { useMemo } from "react";
import { lobbyConfig } from "@/components/Lobby/lobby.config";

export function Atmosphere() {
  const particles = useMemo(() => {
    const count = lobbyConfig.particles.desktop;

    return Array.from({ length: count }, (_, index) => {
      const depth = index % 3;
      const size =
        depth === 0
          ? 4 + ((index * 7) % 8)
          : depth === 1
            ? 2 + ((index * 5) % 4)
            : 1 + ((index * 3) % 2);

      return {
        id: index,
        left: (index * 37.13) % 100,
        top: (index * 61.87) % 100,
        size,
        duration: depth === 0 ? 28 : depth === 1 ? 22 : 17,
        delay: -((index * 1.17) % 30),
        depth,
      };
    });
  }, []);

  return (
    <div className="lobby-atmosphere" aria-hidden="true">
      <div className="lobby-atmosphere__lamp" />
      <div className="lobby-atmosphere__cool" />
      <div className="lobby-atmosphere__astrolabe" />
      <div className="lobby-atmosphere__grain" />
      {particles.map((particle) => (
        <span
          key={particle.id}
          className={`lobby-atmosphere__particle depth-${particle.depth}`}
          style={
            {
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
