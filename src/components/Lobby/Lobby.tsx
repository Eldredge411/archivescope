"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Atmosphere } from "@/components/Lobby/Atmosphere";
import { GlobeScene } from "@/components/Lobby/GlobeScene";
import { lobbyConfig } from "@/components/Lobby/lobby.config";

export function Lobby() {
  const [isTextureReady, setIsTextureReady] = useState(false);
  const [isRevealComplete, setIsRevealComplete] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(max-width: 700px)").matches,
  );
  const [now, setNow] = useState(0);
  const [isHoveringGlobe, setIsHoveringGlobe] = useState(false);
  const isIdle = isReducedMotion || isRevealComplete;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileMedia = window.matchMedia("(max-width: 700px)");
    const changeMedia = () => setIsReducedMotion(media.matches);
    const changeMobile = () => setIsMobile(mobileMedia.matches);

    media.addEventListener("change", changeMedia);
    mobileMedia.addEventListener("change", changeMobile);

    return () => {
      media.removeEventListener("change", changeMedia);
      mobileMedia.removeEventListener("change", changeMobile);
    };
  }, []);

  useEffect(() => {
    if (isReducedMotion) {
      return;
    }

    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      setNow(performance.now() - startedAt);
    }, 50);

    return () => window.clearInterval(timer);
  }, [isReducedMotion]);

  const handleTextureReady = useCallback(() => setIsTextureReady(true), []);
  const handleRevealComplete = useCallback(() => {
    setIsRevealComplete(true);
  }, []);

  const titleLetters = useMemo(
    () => lobbyConfig.copy.title.split(""),
    [],
  );

  const sloganTypedLength = useMemo(() => {
    if (isReducedMotion) {
      return lobbyConfig.copy.sloganZh.length;
    }

    return Math.max(
      0,
      Math.floor(
        (now - lobbyConfig.motion.sloganStartMs) /
          lobbyConfig.motion.sloganTypeIntervalMs,
      ),
    );
  }, [isReducedMotion, now]);

  const caretVisible = useMemo(() => {
    if (isReducedMotion || isIdle) {
      return false;
    }

    const caretElapsed =
      (now -
        lobbyConfig.motion.sloganStartMs -
        lobbyConfig.copy.sloganZh.length *
          lobbyConfig.motion.sloganTypeIntervalMs) /
      500;

    return caretElapsed >= 0 && Math.floor(caretElapsed) < lobbyConfig.motion.sloganCaretBlinks;
  }, [isIdle, isReducedMotion, now]);

  const skipAnimation = () => {
    setNow(lobbyConfig.motion.idleStartMs + 1);
    handleRevealComplete();
  };
  const handleHoverChange = useCallback((isHovering: boolean) => {
    setIsHoveringGlobe(isHovering);
  }, []);
  return (
    <section className="lobby-home" aria-label="ArchiveScope 档案地球入口">
      <Atmosphere />

      <div className="lobby-home__stage">
        <header className="lobby-title">
          <span
            className="lobby-title__rule"
            style={
              isReducedMotion || now >= lobbyConfig.motion.titleRuleStartMs
                ? { transform: "scaleX(1)" }
                : undefined
            }
          />
          <h1 aria-label={lobbyConfig.copy.title}>
            {titleLetters.map((letter, index) => (
              <span
                key={`${letter}-${index}`}
                style={{
                  animationDelay: `${
                    lobbyConfig.motion.titleLetterStartMs +
                    index * lobbyConfig.motion.titleLetterIntervalMs
                  }ms`,
                }}
              >
                {letter}
              </span>
            ))}
          </h1>
          <p
            className="lobby-title__subtitle"
            style={{
              animationDelay: `${lobbyConfig.motion.subtitleStartMs}ms`,
            }}
          >
            {lobbyConfig.copy.subtitle}
          </p>
          <p className="lobby-title__slogan">
            {lobbyConfig.copy.sloganZh.slice(0, sloganTypedLength)}
            <i className={caretVisible ? "is-visible" : ""} aria-hidden="true" />
          </p>
          <p
            className="lobby-title__english"
            style={{
              animationDelay: `${lobbyConfig.motion.sloganEnglishStartMs}ms`,
            }}
          >
            {lobbyConfig.copy.sloganEn}
          </p>
        </header>

        <div className="lobby-home__globe">
          <GlobeScene
            isReducedMotion={isReducedMotion}
            isMobile={isMobile}
            onTextureReady={handleTextureReady}
            onRevealComplete={handleRevealComplete}
            onHoverChange={handleHoverChange}
          />
          {!isTextureReady ? (
            <div className="lobby-loading">
              <span>GENERATING ARCHIVE EARTH</span>
              <i />
            </div>
          ) : null}
        </div>

        <p
          className={`lobby-cta ${
            isIdle ? "is-visible" : ""
          } ${isHoveringGlobe ? "is-hover" : ""}`}
        >
          {lobbyConfig.copy.cta}
        </p>

        <button
          type="button"
          className="lobby-skip"
          onClick={skipAnimation}
        >
          SKIP ANIMATION →
        </button>
      </div>
    </section>
  );
}
