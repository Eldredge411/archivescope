"use client";

import Link from "next/link";
import { useRef, useState } from "react";

export type LineSidebarSide = "left" | "right";

export type LineSidebarItem = {
  id: string;
  label: string;
  description?: string;
  href?: string;
};

type LineSidebarProps = {
  items: LineSidebarItem[];
  activeIndex: number;
  isVisible: boolean;
  side: LineSidebarSide;
  title: string;
  accentColor?: string;
  textColor?: string;
  markerColor?: string;
  showIndex?: boolean;
  showMarker?: boolean;
  proximityRadius?: number;
  maxShift?: number;
  falloff?: "linear" | "smooth";
  markerLength?: number;
  markerGap?: number;
  tickScale?: number;
  scaleTick?: boolean;
  itemGap?: number;
  fontSize?: number;
  smoothing?: number;
  onItemClick?: (index: number, item: LineSidebarItem) => void;
};

function getProximity(distance: number, radius: number, falloff: "linear" | "smooth") {
  if (distance >= radius) {
    return 0;
  }

  const ratio = 1 - distance / radius;

  return falloff === "smooth" ? ratio * ratio * (3 - 2 * ratio) : ratio;
}

export function LineSidebar({
  items,
  activeIndex,
  isVisible,
  side,
  title,
  accentColor = "#C79A63",
  textColor = "#D8C8B4",
  markerColor = "#7C5F43",
  showIndex = true,
  showMarker = true,
  proximityRadius = 100,
  maxShift = 30,
  falloff = "smooth",
  markerLength = 60,
  markerGap = 0,
  tickScale = 0.5,
  scaleTick = true,
  itemGap = 20,
  fontSize = 1.1,
  smoothing = 100,
  onItemClick,
}: LineSidebarProps) {
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [itemCenters, setItemCenters] = useState<number[]>([]);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const direction = side === "left" ? 1 : -1;

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const centers = itemRefs.current.map((itemNode) => {
      if (!itemNode) {
        return Number.POSITIVE_INFINITY;
      }

      const itemBounds = itemNode.getBoundingClientRect();

      return itemBounds.top - bounds.top + itemBounds.height / 2;
    });

    setPointer({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
    setItemCenters(centers);
  };

  return (
    <div
      className={`line-sidebar line-sidebar--${side} ${isVisible ? "is-visible" : ""}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setPointer(null)}
      style={{ gap: `${itemGap}px`, fontSize: `${fontSize}rem` }}
      aria-hidden={!isVisible}
    >
      <div className="line-sidebar__plate" aria-hidden={!isVisible}>
        <span>{title}</span>
      </div>

      {items.map((item, index) => {
        let shift = 0;

        if (pointer && isVisible && Number.isFinite(itemCenters[index])) {
          const distance = Math.abs(pointer.y - itemCenters[index]);
          shift = maxShift * direction * getProximity(distance, proximityRadius, falloff);
        }

        const isActive = index === activeIndex;
        const itemClassName = `line-sidebar__item ${isActive ? "is-active" : ""}`;
        const itemStyle = {
          transform: `translateX(${shift}px)`,
          transition: `transform ${smoothing}ms cubic-bezier(.22,.8,.24,1), color 180ms ease, opacity 180ms ease`,
        };
        const itemContent = (
          <>
            {showIndex ? (
              <span className="line-sidebar__index">{String(index + 1).padStart(2, "0")}</span>
            ) : null}

            {showMarker ? (
              <span
                className="line-sidebar__marker"
                style={{
                  width: `${isActive ? markerLength * 1.65 : markerLength}px`,
                  marginLeft: side === "right" ? 0 : `${markerGap}px`,
                  marginRight: side === "right" ? `${markerGap}px` : 0,
                  backgroundColor: isActive ? accentColor : markerColor,
                  height: `${(scaleTick ? tickScale : 1) * 2}px`,
                }}
              />
            ) : null}

            <span
              className="line-sidebar__label"
              style={{ color: isActive ? accentColor : textColor }}
            >
              {item.label}
            </span>
          </>
        );

        if (item.href) {
          return (
            <Link
              key={item.id}
              href={item.href}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              className={itemClassName}
              onClick={() => onItemClick?.(index, item)}
              tabIndex={isVisible ? 0 : -1}
              style={itemStyle}
              aria-label={item.description ? `${item.label}：${item.description}` : item.label}
            >
              {itemContent}
            </Link>
          );
        }

        return (
          <button
            key={item.id}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
            type="button"
            className={itemClassName}
            onClick={() => onItemClick?.(index, item)}
            tabIndex={isVisible ? 0 : -1}
            style={itemStyle}
          >
            {itemContent}
          </button>
        );
      })}
    </div>
  );
}
