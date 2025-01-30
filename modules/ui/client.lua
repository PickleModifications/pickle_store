LOCAL_DATA = {}
local BASKET_IDENTIFIER = nil

function GetCustomCommandsJS()
    local customCommands = {}
    for command, cfg in pairs(Config.CustomCommands) do
        customCommands[command] = {
            label = cfg.label,
            fields = cfg.fields,
        }
    end
    return customCommands
end

RegisterNUICallback("requestConfig", function(data, cb)
    TriggerServerEvent("pickle_tebexstore:requestInfo")
end)

RegisterNUICallback("setVisible", function(data, cb)
    SetNuiFocus(false, false)
    TriggerScreenblurFadeOut(1000)
    cb(true)
end)

RegisterNUICallback("updateBasketIdentifier", function(data, cb)
    BASKET_IDENTIFIER = data
    cb(true)
end)

RegisterNUICallback("updateProduct", function(product)
    if not product or not product.id then return end
    TriggerServerEvent("pickle_tebexstore:updateProduct", product.id, product)
end)

RegisterNUICallback("purchaseProduct", function(packageId, cb)
    lib.callback('pickle_tebexstore:getPurchaseUrl', false, function(tebexResult)
        cb(tebexResult)
    end, packageId)
end)

RegisterNUICallback("redeemTransaction", function(transactionId, cb)
    lib.callback('pickle_tebexstore:redeemTransaction', false, function(success, reason)
        cb({
            success = success,
            statusText = reason,
        })
    end, transactionId)
end)

RegisterNUICallback("purchaseCoinProduct", function(data, cb)
    cb(true)
    local productId = data.productId
    local rawFields = data.fields
    local product = ProductInfo[productId]
    if not product then return end
    if #product.commands < 1 then return ShowNotification(_L("no_action")) end
    for i=1, #product.commands do
        local command = GetCustomCommand(product.commands[i], rawFields[i], {productId = productId})
        if command and command.purchaseCheckClient then
            local success, reason = command.purchaseCheckClient()
            if not success then return ShowNotification(_L("cancel_command_failed", reason or "Unknown Reason")) end
        end
    end
    TriggerServerEvent("pickle_tebexstore:purchaseProduct", productId, rawFields)
end)

RegisterNUICallback("deleteProduct", function(productId, cb)
    TriggerServerEvent("pickle_tebexstore:deleteProduct", productId)
    cb(true)
end)

RegisterNUICallback("createProduct", function(data, cb)
    TriggerServerEvent("pickle_tebexstore:createProduct", data)
    cb(true)
end)

RegisterNetEvent("pickle_tebexstore:setRedeemStatus", function(status)
    SendNUIMessage({
        type = "setRedeemStatus",
        status = (status and {
            success = true,
            statusText = "Transaction redeemed successfully."
        } or {
            success = false,
            statusText = "Transaction could not be redeemed."
        })
    })
end)

RegisterNetEvent("pickle_tebexstore:updatePlayerCoins", function(coins)
    UpdateCoins(coins)
end)

RegisterNetEvent("pickle_tebexstore:requestInfo", function(data)
    if (data.productInfo) then
        ProductInfo = data.productInfo 
    end
    LOCAL_DATA = data
    SendNUIMessage({
        type = "setConfig",
        config = {
            theme = Config.Theme,
            tebexStoreUrl = Config.TebexStoreUrl,
            tebexApiKey = Config.TebexApiKey,
            basketIdentifier = BASKET_IDENTIFIER,
            username_id = LOCAL_DATA.username_id, 
            discord_id = LOCAL_DATA.discord_id, 
            username = LOCAL_DATA.username or "UNKNOWN USER",
            customPages = Config.CustomPages,
            image = "images/logo.png",
            coins = LOCAL_DATA.coins,
            permissions = {
                manageProducts = true
            },
            coinCurrency = Config.CoinCurrency,
            productInfo = GetProductInfoArray(),
            customCommands = GetCustomCommandsJS(),
        }
    })
end)

RegisterCommand("store", function()
    TriggerScreenblurFadeIn(1000)
    SetNuiFocus(true, true)
    SendNUIMessage({
        type = "setVisible",
        visible = true
    })
end)