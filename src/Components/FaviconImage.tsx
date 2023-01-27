import React, { SyntheticEvent } from "react";
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
  favIconUrl?: string;
} & React.ImgHTMLAttributes<HTMLImageElement>;

export const Favicon: React.FC<FaviconProps> = ({ url, favIconUrl, className, ...props }) => (
  <img
    src={favIconUrl !== undefined ? favIconUrl : getFaviconUrl(url)}
    onError={(e: SyntheticEvent<HTMLImageElement>) => {
      (e.target as HTMLImageElement).src = backup;
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
