import { getMessage } from "@extend-chrome/messages";

// copied from node_modules/@mozilla/readability/index.d.ts
export interface Article {
  /** article title */
  title: string;
  /** author metadata */
  byline: string;
  /** content direction */
  dir: string;
  /** HTML of processed article content */
  content: string;
  /** text content of the article (all HTML removed) */
  textContent: string;
  /** length of an article, in characters */
  length: number;
  /** article description, or short excerpt from the content */
  excerpt: string;
  siteName: string;
}

interface Doc {
  doc: null | Article;
}

export const [sendReadability, readabilityStream, waitForReadability] = getMessage<Doc>("READABILITY");
export const [sendReader, readerStream, waitForReader] = getMessage<Doc>("READER");

// If you have a message type with no data, use void rather than undefined
// This way you can call it with zero arguments
export const [sendReady, readyStream, waitForReady] = getMessage<void>("READY");
