declare namespace SearchModuleCssNamespace {
  export interface ISearchModuleCss {
    autocomplete_box: string;
    icon: string;
    search_box: string;
    search_input: string;
    wrapper: string;
  }
}

declare const SearchModuleCssModule: SearchModuleCssNamespace.ISearchModuleCss & {
  /** WARNING: Only available when `css-loader` is used without `style-loader` or `mini-css-extract-plugin` */
  locals: SearchModuleCssNamespace.ISearchModuleCss;
};

export = SearchModuleCssModule;
