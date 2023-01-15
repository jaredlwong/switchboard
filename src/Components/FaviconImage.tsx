import React from "react";
import { css, cx } from "@linaria/core";

const backup = "https://www.google.com/s2/favicons?domain=example.com";

function getFaviconUrl(url?: string): string {
  if (!url) {
    return backup;
  }
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}`;
  } catch (error) {
    return backup;
  }
}

type FaviconProps = {
  url?: string;
} & React.ImgHTMLAttributes<HTMLImageElement>;

export const Favicon: React.FC<FaviconProps> = ({ url, className, ...props }) => (
  <img
    src={getFaviconUrl(url)}
    onError={(e: any) => {
      e.target.src = backup;
    }}
    className={cx(
      className,
      css`
        display: inline-block;
        margin: 0 4px;
      `,
    )}
    {...props}
  ></img>
);
