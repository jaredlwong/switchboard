import { table } from "console";
import { sendReader, readabilityStream, waitForReady } from "./messages";

// chrome.action.onClicked.addListener(async (tab) => {
//   console.log('hi i got clicked')
//   const res = await chrome.scripting.executeScript({
//     target: { tabId: tab.id! },
//     files: ["js/extension.js"],
//   });
//   console.log(res);
// });

readabilityStream.subscribe(async ([{ doc }, sender]) => {
  console.log(sender);
  console.log(doc);
  const tab = await chrome.tabs.create({
    url: `chrome-extension://${chrome.runtime.id}/reader.html`,
  });
  await waitForReady((res) => {
    const [_, sender] = res as any;
    console.log("wait for ready");
    console.log(sender, sender.tab.id, tab.id);
    return sender.tab.id === tab.id;
  });
  console.log("sending");
  await sendReader({ doc }, { tabId: tab.id! });

  // setTimeout(() => {
  //   console.log('sending');
  //   sendReader({ doc });
  // }, 10000);
});
