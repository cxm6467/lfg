import { Client, Events, GatewayIntentBits } from "./node_modules/discord.js";
import dotenv from "dotenv";
import { mongooseConnectionHelper } from "./services/mongoose-connection-helper";

dotenv.config();

(async function() {
  const { DISCORD_BOT_TOKEN } = process.env;
  const client = new Client({ intents: GatewayIntentBits.Guilds });
  
  client.once(Events.ClientReady, async () => {
    console.log("Ready!");
    await mongooseConnectionHelper();
  });
  client.login(DISCORD_BOT_TOKEN);
})();