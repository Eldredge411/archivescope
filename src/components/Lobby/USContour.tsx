"use client";

export function USContour() {
  return (
    <svg
      className="lobby-us-contour"
      viewBox="0 0 160 92"
      aria-hidden="true"
      role="presentation"
    >
      <path
        className="lobby-us-contour__stroke"
        d="M29 24 L54 18 L70 21 L94 15 L113 16 L125 21 L118 33 L123 40 L110 45 L108 54 L96 57 L90 68 L83 66 L79 74 L72 73 L65 81 L56 75 L48 67 L42 53 L31 44 L20 35 Z"
      />
      <path
        className="lobby-us-contour__alaska"
        d="M7 22 L15 16 L25 18 L22 25 L13 29 Z"
      />
      <path
        className="lobby-us-contour__hawaii"
        d="M14 67 L18 64 L22 66 L19 70 L15 70 Z"
      />
    </svg>
  );
}
