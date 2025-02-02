ConfigSV = {}
ConfigSV.Webhooks = {
    ["onCoinProductPurchase"] = { 
        url = "DISCORD_WEBHOOK_URL",
        title = "Coin Product Purchase", 
        fields = {
            { name = "Product ID", value = "productId", inline = true },
            { name = "Product Label", value = "productLabel", inline = true },
            { name = "Price", value = "coins", inline = true },
            { name = "Player", value = "player", inline = true },
            { name = "Command(s) Executed:", value = "commands", inline = true },
        } 
    },
    ["onCoinAdded"] = { 
        url = "DISCORD_WEBHOOK_URL",
        title = "Coin(s) Added to Player",
        fields = {
            { name = "Player", value = "player", inline = true },
            { name = "Origin", value = "origin", inline = true },
            { name = "Amount", value = "playerCoins", inline = true },
        }
    },
    ["onCoinRemoved"] = { 
        url = "DISCORD_WEBHOOK_URL",
        title = "Coin(s) Removed from Player",
        fields = {
            { name = "Player", value = "player", inline = true },
            { name = "Origin", value = "origin", inline = true },
            { name = "Amount", value = "playerCoins", inline = true },
        }
    },
}
ConfigSV.WebhookHandler = function(webhookId, fields)
    local webhook = ConfigSV.Webhooks[webhookId]
    if webhook then
        if webhook.url == "DISCORD_WEBHOOK_URL" then return end
        local embed = {
            {
                ["title"] = webhook.title,
                ["color"] = 16711680,
                ["fields"] = {},
                ["footer"] ={
                    ["text"] = os.date("%c"),
                },
            }
        }
        for i=1, #webhook.fields do
            local field = webhook.fields[i]
            table.insert(embed[1].fields, {
                ["name"] = field.name,
                ["value"] = fields[field.value],
            })
        end
        PerformHttpRequest(webhook.url, function(err, text, headers) end, "POST", json.encode({embeds = embed}), {["Content-Type"] = "application/json"})
    end
end