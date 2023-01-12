declare namespace TabGroupTableModuleCssNamespace {
  export interface ITabGroupTableModuleCss {
    favicon: string;
    link: string;
  }
}

declare const TabGroupTableModuleCssModule: TabGroupTableModuleCssNamespace.ITabGroupTableModuleCss & {
  /** WARNING: Only available when `css-loader` is used without `style-loader` or `mini-css-extract-plugin` */
  locals: TabGroupTableModuleCssNamespace.ITabGroupTableModuleCss;
};

export = TabGroupTableModuleCssModule;
