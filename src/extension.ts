import { Readability } from "@mozilla/readability";
import { sendReadability } from "./messages";

console.log("hi i got clicked inside extension");
const documentClone = document.cloneNode(true) as Document;
const article = new Readability(documentClone).parse();
sendReadability({ doc: article });
