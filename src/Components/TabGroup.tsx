import { css, cx } from "@linaria/core";
import { IconVolume, IconVolumeOff } from "@tabler/icons";
import React, { ReactNode, useCallback, useState } from "react";
import { closeTab, closeTabs, focusOnTab, muteTab, muteTabs, saveTabsToFolder, unmuteTab } from "../utils/chrome";
import { Favicon } from "./FaviconImage";

// const styles = require("./TabGroup.module.css");
import styles from "./TabGroup.module.css";

export const TabGroup: React.FC<{ groupName: string; tabs: chrome.tabs.Tab[]; onUpdate: VoidCallback }> = ({
  groupName,
  tabs,
  onUpdate,
}) => {
  const [selectedTabs, setSelectedTabs] = useState<chrome.tabs.Tab[]>([]);

  function handleCheckboxChange(tab: chrome.tabs.Tab) {
    const id = tab.id;
    if (id === undefined) {
      return;
    }
    if (selectedTabs.includes(tab)) {
      setSelectedTabs(selectedTabs.filter((t) => t !== tab));
    } else {
      setSelectedTabs([...selectedTabs, tab]);
    }
  }

  function handleAllTabsChanged() {
    if (selectedTabs.length === tabs.length) {
      setSelectedTabs([]);
    } else {
      setSelectedTabs(tabs);
    }
  }

  async function closeSelectedTabs() {
    await closeTabs(selectedTabs);
    setSelectedTabs([]);
  }

  async function bookmarkGroup() {
    await saveTabsToFolder(groupName, tabs);
    await closeTabs(tabs);
  }

  return (
    <div className={cx(styles.tab_group, styles.shadow_sm)}>
      <div className={cx(styles.table_header)}>
        <div className={cx(styles.header_actions)}>
          <div className={cx(styles.header_info)}>
            <span className={cx(styles.text, styles.text_sm_semibold)}>{groupName}</span>
            <div className={cx(styles.badge)}>
              <span className={cx(styles.text_1, styles.text_xs_medium)}>{tabs.length} tabs</span>
            </div>
          </div>
          <div className={cx(styles.header_actions_1)}>
            {/* mute button */}
            <button className={cx(styles.button, "bg-zinc-100 hover:bg-zinc-200")} onClick={() => muteTabs(tabs)}>
              <span className={cx(styles.text_2, styles.text_sm_semibold)}>Mute</span>
            </button>
            {/* close tabs */}
            <button
              className={cx(styles.button, "bg-fuchsia-100 text-white hover:bg-fuchsia-200")}
              onClick={() => closeSelectedTabs()}
            >
              <div className={cx(styles.trash_01)}>
                <svg
                  className={cx(styles.icon)}
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="16"
                  viewBox="0 0 15 16"
                  fill="none"
                >
                  <path
                    d="M10.3333 3.74999V3.18332C10.3333 2.38992 10.3333 1.99321 10.1789 1.69017C10.0431 1.42361 9.82638 1.20688 9.55982 1.07106C9.25678 0.916656 8.86007 0.916656 8.06667 0.916656H6.93333C6.13993 0.916656 5.74322 0.916656 5.44018 1.07106C5.17362 1.20688 4.95689 1.42361 4.82107 1.69017C4.66667 1.99321 4.66667 2.38992 4.66667 3.18332V3.74999M6.08333 7.64582V11.1875M8.91667 7.64582V11.1875M1.125 3.74999H13.875M12.4583 3.74999V11.6833C12.4583 12.8734 12.4583 13.4685 12.2267 13.9231C12.023 14.3229 11.6979 14.648 11.2981 14.8517C10.8435 15.0833 10.2484 15.0833 9.05833 15.0833H5.94167C4.75156 15.0833 4.1565 15.0833 3.70194 14.8517C3.30209 14.648 2.97701 14.3229 2.77328 13.9231C2.54167 13.4685 2.54167 12.8734 2.54167 11.6833V3.74999"
                    stroke="black"
                    stroke-width="1.7"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
              <span className={cx(styles.text_3, styles.text_sm_semibold)}>Close Tabs</span>
            </button>
            <button className={cx(styles.button, "bg-indigo-100 hover:bg-indigo-200")} onClick={() => bookmarkGroup()}>
              <div className={cx(styles.bookmark_x)}>
                <svg
                  className={cx(styles.icon_1)}
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="18"
                  viewBox="0 0 14 18"
                  fill="none"
                >
                  <path
                    d="M4.91667 5.25L9.08333 9.41667M9.08333 5.25L4.91667 9.41667M12.8333 16.5V5.5C12.8333 4.09987 12.8333 3.3998 12.5609 2.86502C12.3212 2.39462 11.9387 2.01217 11.4683 1.77248C10.9335 1.5 10.2335 1.5 8.83333 1.5H5.16667C3.76654 1.5 3.06647 1.5 2.53169 1.77248C2.06129 2.01217 1.67884 2.39462 1.43915 2.86502C1.16667 3.3998 1.16667 4.09987 1.16667 5.5V16.5L7 13.1667L12.8333 16.5Z"
                    stroke="#344054"
                    stroke-width="1.66667"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
              <span className={cx(styles.text_4, styles.text_sm_semibold)}>Bookmark Group</span>
            </button>
            <div className={cx(styles.input_dropdown)}>
              <div className={cx(styles.input_with_label)}>
                <div className={cx(styles.input, styles.shadow_xs)}>
                  <div className={cx(styles.content)}>
                    <span className={cx(styles.text_5, styles.text_sm_semibold)}>Blog</span>
                  </div>
                  <div className={cx(styles.chevron_down)}>
                    <svg
                      className={cx(styles.icon_2)}
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="8"
                      viewBox="0 0 12 8"
                      fill="none"
                    >
                      <path
                        d="M1 1.5L6 6.5L11 1.5"
                        stroke="#667085"
                        stroke-width="1.66667"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={cx(styles.tab_table)}>
        <div className={cx(styles.select_checks)}>
          <div className="h-6 w-full flex justify-center items-center border-b border-gray-200 group">
            <input
              type="checkbox"
              checked={tabs.length === selectedTabs.length && tabs.every((t) => selectedTabs.includes(t))}
              onChange={() => handleAllTabsChanged()}
            />
          </div>
          {tabs.map((tab) => {
            return (
              <div key={tab.id} className="h-6 w-full flex justify-center items-center border-b border-gray-200 group">
                <input
                  // className="bg-purple-400 rounded"
                  type="checkbox"
                  checked={selectedTabs.includes(tab)}
                  onChange={() => handleCheckboxChange(tab)}
                />
              </div>
            );
          })}
        </div>
        <div className={cx(styles.tabs)}>
          <div className={cx(styles.table_header_cell_1)}>
            <span className={cx(styles.text_6, styles.text_xs_medium)}>Tab</span>
          </div>
          {tabs.map((tab) => {
            const handleClick = async () => {
              await focusOnTab(tab);
            };

            return (
              <div key={tab.id} className={cx(styles.table_cell_16)}>
                <div
                  className="flex flex-no-wrap min-w-0 items-center hover:underline cursor-pointer"
                  onClick={handleClick}
                >
                  <Favicon url={tab.url} />
                  <span className={cx(styles.text_7, styles.text_sm_semibold, styles.nowrap_noscroll)}>
                    {tab.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className={cx(styles.opened_at)}>
          <div className={cx(styles.table_header_cell_2)}>
            <div className={cx(styles.table_header_1)}>
              <span className={cx(styles.text_23, styles.text_xs_medium)}>Opened</span>
            </div>
          </div>
          {tabs.map((tab) => {
            return (
              <div className={cx(styles.table_cell_32)}>
                <span className={cx(styles.text_24, styles.text_sm_regular)}>22 Jan 2022</span>
              </div>
            );
          })}
        </div>
        <div className={cx(styles.close_tab)}>
          <div className={cx(styles.table_header_cell_3, "w-8")} />
          {tabs.map((tab) => {
            const closeTabHandler = async () => {
              await closeTab(tab);
            };

            return (
              <div key={tab.id} className="h-6 w-full flex justify-center items-center border-b border-gray-200 group">
                <button onClick={closeTabHandler}>
                  <svg
                    // className={cx(styles.close_tab)}
                    className="cursor-pointer"
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="16"
                    viewBox="0 0 14 16"
                    fill="none"
                  >
                    <path
                      className="stroke-black group-hover:stroke-red-500"
                      d="M9.66667 3.99998V3.46665C9.66667 2.71991 9.66667 2.34654 9.52134 2.06133C9.39351 1.81044 9.18954 1.60647 8.93865 1.47864C8.65344 1.33331 8.28007 1.33331 7.53333 1.33331H6.46667C5.71993 1.33331 5.34656 1.33331 5.06135 1.47864C4.81046 1.60647 4.60649 1.81044 4.47866 2.06133C4.33333 2.34654 4.33333 2.71991 4.33333 3.46665V3.99998M5.66667 7.66665V11M8.33333 7.66665V11M1 3.99998H13M11.6667 3.99998V11.4666C11.6667 12.5868 11.6667 13.1468 11.4487 13.5746C11.2569 13.951 10.951 14.2569 10.5746 14.4487C10.1468 14.6666 9.58677 14.6666 8.46667 14.6666H5.53333C4.41323 14.6666 3.85318 14.6666 3.42535 14.4487C3.04903 14.2569 2.74307 13.951 2.55132 13.5746C2.33333 13.1468 2.33333 12.5868 2.33333 11.4666V3.99998"
                      // stroke="black"
                      stroke-width="1.6"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
        <div className={cx(styles.mute_tab)}>
          <div className={cx(styles.table_header_cell_4, "w-8")} />
          {tabs.map((tab) => {
            let inner = <></>;
            if (tab.mutedInfo?.muted) {
              inner = (
                <button
                  onClick={() => {
                    console.log("unmute");
                    unmuteTab(tab); //.then(() => onUpdate());
                    //unmuteTab(tab).then(() => onUpdate());
                  }}
                >
                  <IconVolumeOff size={16} />
                </button>
              );
            } else if (tab.audible) {
              inner = (
                <button
                  onClick={() => {
                    console.log("mute");
                    muteTab(tab); //.then(() => onUpdate());
                  }}
                >
                  <IconVolume size={16} />
                </button>
              );
            }
            return (
              <div key={tab.id} className="h-6 w-full flex justify-center items-center border-b border-gray-200">
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
