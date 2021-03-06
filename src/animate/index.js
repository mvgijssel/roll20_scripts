import Context from "../lib/Context";
import Cli from "./Cli";

on("ready", () => {
  on("chat:message", (message) => {
    const context = new Context("animate", message);
    const cli = new Cli(context);
    cli.execute();
  });
});
