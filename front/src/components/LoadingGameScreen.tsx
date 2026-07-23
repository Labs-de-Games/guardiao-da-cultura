"use client";

import Image from "next/image";
import { useState } from "react";
import { LayoutConfig } from "@/game/constants/LayoutConfig";
import { LoadingIndicator } from "./LoadingIndicator";

export interface LoadingGameScreenProps {
  /** e.g. "level_03" — selects the matching regional background. Omit for a neutral screen. */
  levelId?: string;
  /** 0-100. Omit to show an indeterminate sweep animation. */
  progress?: number;
}

export default function LoadingGameScreen({
  levelId,
  progress,
}: LoadingGameScreenProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const levelNumber = levelId?.match(/(\d+)$/)?.[1];
  const backgroundSrc =
    levelNumber && !imageFailed
      ? `/assets/data/levels/${levelId}/intro/loading_L${Number(levelNumber)}.png`
      : null;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: LayoutConfig.COLORS.MAP_BG_CSS,
        overflow: "hidden",
        zIndex: 50,
      }}
    >
      {backgroundSrc && (
        <Image
          src={backgroundSrc}
          alt=""
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover", imageRendering: "pixelated" }}
          onError={() => setImageFailed(true)}
        />
      )}

      <LoadingIndicator progress={progress} />
    </div>
  );
}
