"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Atmosphere } from "@/components/Lobby/Atmosphere";
import { GlobeScene } from "@/components/Lobby/GlobeScene";
import { USContour } from "@/components/Lobby/USContour";
import { lobbyConfig } from "@/components/Lobby/lobby.config";

export function Lobby() {
  const [isTextureReady, setIsTextureReady] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
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
  const [showPrompt, setShowPrompt] = useState(false);
  const promptText = "EXPLORE ARCHIVE →";

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
    const resetTimer = () => setShowPrompt(false);
    const timer = window.setTimeout(
      () => setShowPrompt(true),
      lobbyConfig.motion.inactivityMs,
    );

    window.addEventListener("pointermove", resetTimer);
    window.addEventListener("keydown", resetTimer);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
    };
  }, []);

  const typedPrompt = useMemo(
    () =>
      isReducedMotion
        ? promptText
        : promptText.slice(
            0,
            Math.ceil(showPrompt ? promptText.length : 0),
          ),
    [isReducedMotion, showPrompt],
  );

  return (
    <section className="lobby-home" aria-label="ArchiveScope 档案地球入口">
      <Atmosphere isMobile={isMobile} isReducedMotion={isReducedMotion} />

      <div className="lobby-home__stage">
        <div className="lobby-home__copy">
          <span>ArchiveScope / Lobby</span>
          <h1>档案室中的复古地球仪</h1>
          <p>
            以做旧羊皮卷、墨线大陆和暖黄灯光构筑入口。点击地球，进入美国档案数据资源的建设现场。
          </p>
          <Link className="lobby-home__direct" href="/countries/usa">
            直接查看美国档案卷宗
          </Link>
        </div>

        <div className="lobby-home__globe">
          <GlobeScene
            onTextureReady={() => setIsTextureReady(true)}
            onTransitionStart={() => setIsTransitioning(true)}
          />
          <div className="lobby-home__overlay">
            <USContour />
            <div
              className={`lobby-us-marker ${
                showPrompt ? "is-visible" : ""
              } ${isTextureReady ? "is-ready" : ""}`}
              aria-live="polite"
            >
              {typedPrompt}
              {!isReducedMotion ? <i /> : null}
            </div>
            {!isTextureReady ? (
              <div className="lobby-loading">
                <span>GENERATING ARCHIVE EARTH</span>
                <i />
              </div>
            ) : null}
          </div>
          {isTransitioning ? (
            <div className="lobby-gold-burst" aria-hidden="true" />
          ) : null}
        </div>

        <Link className="lobby-skip" href="/stacks?country=usa">
          SKIP ANIMATION →
        </Link>
      </div>
    </section>
  );
}
