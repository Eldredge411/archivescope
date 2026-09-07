"use client";

import { useMemo } from "react";
import { lobbyConfig } from "@/components/Lobby/lobby.config";

type AtmosphereProps = {
  isMobile: boolean;
  isReducedMotion: boolean;
};

export function Atmosphere({ isMobile, isReducedMotion }: AtmosphereProps) {
  const particles = useMemo(() => {
    const count = isMobile
      ? lobbyConfig.particles.mobile
      : lobbyConfig.particles.desktop;

    return Array.from({ length: count }, (_, index) => ({
      id: index,
      left: (index * 37.13) % 100,
      top: (index * 61.87) % 100,
      size: 2 + ((index * 7) % 8),
      duration: 14 + ((index * 13) % 19),
      delay: -((index * 1.17) % 22),
      depth: index % 3,
    }));
  }, [isMobile]);

  return (
    <div className="lobby-atmosphere" aria-hidden="true">
      <div className="lobby-atmosphere__lamp" />
      <div className="lobby-atmosphere__grain" />
      {!isReducedMotion
        ? particles.map((particle) => (
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
          ))
        : null}
    </div>
  );
}
