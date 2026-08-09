"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ResourceDossierNoteProps = {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export function ResourceDossierNote({
  id,
  title,
  description,
  children,
}: ResourceDossierNoteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const modal =
    isMounted && isOpen
      ? createPortal(
          <div
            className="resource-dossier-note-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-modal-title`}
          >
            <button
              type="button"
              className="resource-dossier-note-modal__backdrop"
              aria-label="关闭便签"
              onClick={() => setIsOpen(false)}
            />
            <article className="resource-dossier-note-modal__paper">
              <header className="resource-dossier-note-modal__header">
                <div>
                  <span>放大便签</span>
                  <h2 id={`${id}-modal-title`}>{title}</h2>
                  {description ? <p>{description}</p> : null}
                </div>
                <button
                  type="button"
                  aria-label="关闭便签"
                  onClick={() => setIsOpen(false)}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </header>
              <div className="resource-dossier-note-modal__body">{children}</div>
            </article>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <article id={id} className="resource-dossier-note-card scroll-mt-24">
        <header className="resource-dossier-note-card__header">
          <div>
            <span>分卷便签</span>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" onClick={() => setIsOpen(true)}>
            展开便签
          </button>
        </header>
        <div className="resource-dossier-note-card__preview">
          <div>{children}</div>
        </div>
      </article>
      {modal}
    </>
  );
}
