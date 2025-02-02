# 1. Go to https://creator.tebex.io/game-servers and create / link your game server.
Your server.cfg in the end should have sv_tebexSecret set.
# 2. Go to https://creator.tebex.io/packages and create as many coin packages you want.
You need to write the package's info, then go to the bottom and select + Game Server Commands.
Select the game server you've linked in step one, then add a command.
Then, paste this in: pts_givecoins {transaction} {id} COINAMOUNTHERE
Finally, click the gear icon for the command on the right.
Set "Require Player to be Online" to "Execute the command even if the player is offline".
# 3. Go to the config.lua of the resource, then set the following values:
Config.TebexStoreUrl: Homepage URL of your tebex store in case of the user not being logged in.
Config.TebexApiKey: Go to https://creator.tebex.io/developers/api-keys and get your "Public Token"
Config.ItemImageFolder: URL Directory of your inventory's item's folder (not required but makes daily spin ez)
Config.CoinCurrency -> packages: List of all coin package IDs you added in step 2.
Config.StoreManagers: List of identifiers that can manage the store and manage coins.
# 4. Go to the configsv.lua of the resource, then set the following values:
ConfigSV.Webhooks: List of diffferent webhooks set for purchases and coin modification.
# 5. Restart the server with pickle_store ensured in the server.cfg, and enjoy!
If you have any questions, be sure to join https://discord.gg/picklemods for support.