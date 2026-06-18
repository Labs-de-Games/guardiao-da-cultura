"use client";

import {
  CAPTION_BG,
  CAPTION_BORDER,
  CAPTION_BORDER_RADIUS,
  CAPTION_PADDING,
  CAPTION_TITLE_FONT,
  CAPTION_TITLE_SIZE,
  CAPTION_TITLE_COLOR,
  CAPTION_TITLE_LETTER_SPACING,
  CAPTION_TITLE_MARGIN_BOTTOM,
  CAPTION_BODY_FONT,
  CAPTION_BODY_SIZE,
  CAPTION_BODY_COLOR,
  CAPTION_BODY_LINE_HEIGHT,
  CAPTION_IMAGE_WIDTH,
  CAPTION_TEXT_COL_WIDTH,
  CAPTION_IMAGE_MASK,
} from "./constants";

export type CaptionBoxProps = {
  title?: string;
  text: string;
  image?: string;
  imageAlt?: string;
};

/**
 * Caption/dialogue box shown beneath the comic panels during the intro.
 *
 * Dark rounded box with an amber border. A level-specific image is anchored
 * to the right edge and fades out toward the left via a horizontal mask;
 * the text column is constrained to the left portion of the box so it wraps
 * before reaching the image.
 */
export function CaptionBox({ title, text, image, imageAlt = "" }: CaptionBoxProps) {
  return (
    <div
      style={{
        position: "relative",
        background: CAPTION_BG,
        border: CAPTION_BORDER,
        borderRadius: CAPTION_BORDER_RADIUS,
        padding: CAPTION_PADDING,
        width: "100%",
        boxSizing: "border-box",
        // `overflow: hidden` clips the image to the rounded corners
        overflow: "hidden",
      }}
    >
      {image ? (
        <img
          src={image}
          alt={imageAlt}
          aria-hidden={imageAlt ? undefined : true}
          style={{
            // Pinned to the right edge, full height of the box.
            position: "absolute",
            top: 0,
            right: 0,
            height: "100%",
            width: CAPTION_IMAGE_WIDTH,
            objectFit: "cover",
            objectPosition: "right center",
            pointerEvents: "none",
            // Fade gradient (left → right)
            WebkitMaskImage: CAPTION_IMAGE_MASK,
            maskImage: CAPTION_IMAGE_MASK,
          }}
        />
      ) : null}
      {/* TEXT COLUMN: width caps how far the text can run before wrapping */}
      <div style={{ position: "relative", width: CAPTION_TEXT_COL_WIDTH }}>
        {title ? (
          <h3
            style={{
              margin: 0,
              marginBottom: CAPTION_TITLE_MARGIN_BOTTOM,
              fontFamily: CAPTION_TITLE_FONT,
              fontWeight: 400,
              fontSize: CAPTION_TITLE_SIZE,
              lineHeight: 1.1,
              letterSpacing: CAPTION_TITLE_LETTER_SPACING,
              color: CAPTION_TITLE_COLOR,
            }}
          >
            {title}
          </h3>
        ) : null}
        <p
          style={{
            margin: 0,
            fontFamily: CAPTION_BODY_FONT,
            fontSize: CAPTION_BODY_SIZE,
            lineHeight: CAPTION_BODY_LINE_HEIGHT,
            fontWeight: 400,
            color: CAPTION_BODY_COLOR,
          }}
        >
          {text}
        </p>
      </div>
    </div>
  );
}
