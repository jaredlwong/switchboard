import React, { useEffect, useState } from "react";

// const styles = require("./search.module.css");
// import styles from './search.module.css';
// import '../tailwind.css';

async function addCurTabToNewGroup(groupName: string) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs && tabs[0]) {
    const groupId = await chrome.tabs.group({ tabIds: tabs[0].id });
    await chrome.tabGroups.update(groupId, { title: groupName });
  }
}

async function addCurTabToGroup(groupId: number) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs && tabs[0]) {
    await chrome.tabs.group({ groupId: groupId, tabIds: tabs[0].id });
  }
}

function tabGroupColorToTailwind(color: chrome.tabGroups.ColorEnum): string {
  switch (color) {
    case "grey":
      return "bg-gray-500";
    case "blue":
      return "bg-blue-500";
    case "red":
      return "bg-red-500";
    case "yellow":
      return "bg-yellow-500";
    case "green":
      return "bg-green-500";
    case "purple":
      return "bg-purple-500";
    case "cyan":
      return "bg-cyan-500";
    case "orange":
      return "bg-orange-500";
    default:
      return "bg-slate-500";
  }
}

export const Search: React.FC = () => {
  const [searchText, setSearchText] = useState("");
  const [tabGroups, setTabGroups] = useState<chrome.tabGroups.TabGroup[]>([]);

  const addTabButton = () => {
    addCurTabToNewGroup(searchText).then(console.error);
  };

  const addTabToGroup = (groupId: number) => {
    addCurTabToGroup(groupId).then(console.error);
  };

  useEffect(() => {
    chrome.tabGroups.query({}, (groups) => {
      console.log(groups);
      setTabGroups(groups);
    });
  }, []);

  // className="form-input rounded-md py-2 px-4 block w-full leading-5 transition duration-150 ease-in-out sm:text-sm sm:leading-5" placeholder="Search" aria-label="Search"></input>
  return (
    <div className="w-[400px] m-2">
      <div className="flex flex-col space-y-3">
        <div className="flex">
          <div className="grow">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={addTabButton}
            >
              Add Tab to New Group
            </button>
          </div>
        </div>
        <div className="flex w-full">
          <div className="grow">
            <div className="rounded-md bg-white shadow-xs">
              <input
                autoFocus
                type="search"
                onChange={(e) => setSearchText(e.target.value)}
                value={searchText}
                placeholder="Search"
                className="input input-bordered input-sm w-full"
              ></input>
            </div>
          </div>
        </div>
        {tabGroups.map((group) => {
          return (
            <div key={group.id} className="flex">
              <button
                className={`btn btn-sm ${tabGroupColorToTailwind(group.color)}`}
                onClick={() => addTabToGroup(group.id)}
              >
                {group.title}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
//  return (
//    <div className={styles.wrapper}>
//      {/* <div className={styles.search_box}> */}
//      <div>
//        <a href="" target="_blank" hidden></a>
//        {/* <input type="text" autoFocus={true} placeholder="Pick a tab group..." className={styles.search_input}></input> */}
//        <div className="mb-3 pt-0">
//          <input type="text" autoFocus={true} placeholder="Pick a tab group..." className="px-3 py-4 placeholder-slate-300 text-slate-600 relative bg-white bg-white rounded text-base border-0 shadow outline-none focus:outline-none focus:ring w-full"></input>
//        </div>
//        {/* <input type="text" autoFocus={true} placeholder="Pick a tab group..." className={`text-slate-800 ${styles.search_input}`}></input> */}
//        {/* <input type="text" autoFocus={true} placeholder="Pick a tab group..." className="placeholder:italic placeholder:text-slate-400 block bg-white w-full border border-slate-300 rounded-md py-2 pl-9 pr-3 shadow-sm focus:outline-none focus:border-sky-500 focus:ring-sky-500 focus:ring-1 sm:text-sm"></input> */}
//        <div className={styles.autocomplete_box}></div>
//        <div className={styles.icon}><i className="fas fa-search"></i></div>
//      </div>
//    </div>
//  )
