import { merge } from "webpack-merge";
import config from "./webpack.common";

export default merge(config, {
  mode: "production",
});
