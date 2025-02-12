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

function GetHiddenProducts()
    local hiddenPackages = {}
    for i=1, #Config.HiddenPackages do
        hiddenPackages[i] = tostring(Config.HiddenPackages[i])
    end
    for i=1, #Config.CoinCurrency.packages do
        hiddenPackages[#hiddenPackages+1] = tostring(Config.CoinCurrency.packages[i])
    end
    return hiddenPackages
end

function GetWheelPrizes()
    local prizes = {}
    for i=1, #Config.DailySpin.prizes do
        prizes[i] = {
            id = i - 1,
            text = Config.DailySpin.prizes[i].text or "Untitled Prize",
            image = Config.DailySpin.prizes[i].image,
        }
    end
    return prizes
end

RegisterNUICallback("pageLoaded", function(data, cb)
    cb(true)
    TriggerServerEvent("pickle_store:requestInfo")
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

RegisterNUICallback("updateProduct", function(product, cb)
    cb(true)
    if not product or not product.id then return end
    TriggerServerEvent("pickle_store:updateProduct", product.id, product)
end)

RegisterNUICallback("purchaseProduct", function(packageId, cb)
    lib.callback('pickle_store:getPurchaseUrl', false, function(tebexResult)
        cb(tebexResult)
    end, packageId)
end)

RegisterNUICallback("redeemTransaction", function(transactionId, cb)
    lib.callback('pickle_store:redeemTransaction', false, function(success, reason)
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
    local clientFields = {}
    for i=1, #product.commands do
        local command = GetCustomCommand(product.commands[i], rawFields[i], {productId = productId})
        if command and command.purchaseCheckClient then
            local success, reason, additionalFields = command.purchaseCheckClient()
            if not success then return ShowNotification(_L("cancel_command_failed", reason or "Unknown Reason")) end
            clientFields[i] = additionalFields
        end
    end
    TriggerServerEvent("pickle_store:purchaseProduct", productId, rawFields, clientFields)
end)

RegisterNUICallback("deleteProduct", function(productId, cb)
    TriggerServerEvent("pickle_store:deleteProduct", productId)
    cb(true)
end)

RegisterNUICallback("createProduct", function(data, cb)
    TriggerServerEvent("pickle_store:createProduct", data)
    cb(true)
end)

RegisterNUICallback("spinWheel", function(data, cb)
    TriggerServerEvent("pickle_store:spinWheel")
    cb(true)
end)

RegisterNetEvent("pickle_store:setRedeemStatus", function(status)
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

RegisterNetEvent("pickle_store:updatePlayerCoins", function(coins)
    UpdateCoins(coins)
end)

RegisterNetEvent("pickle_store:requestInfo", function(data, productInfo)
    if (productInfo) then
        ProductInfo = productInfo 
    end
    LOCAL_DATA = data
    SendNUIMessage({
        type = "setConfig",
        config = {
            disableAllProducts = Config.DisableAllProductsCategory,
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
            spins = LOCAL_DATA.spins,
            nextSpinTime = LOCAL_DATA.nextSpinTime,
            permissions = LOCAL_DATA.permissions,
            coinCurrency = Config.CoinCurrency,
            productInfo = GetProductInfoArray(),
            customCommands = GetCustomCommandsJS(),
            hiddenProducts = GetHiddenProducts(),
            wheelPrizes = GetWheelPrizes(),
        }
    })
end)

RegisterNetEvent("pickle_store:startSpin", function(spins, nextSpinTime, prizeId)
    SendNUIMessage({
        type = "spinWheel",
        spins = spins,
        nextSpinTime = nextSpinTime,
        prizeId = prizeId,
    })
end)

RegisterNetEvent("pickle_store:openStore", function(products)
    TriggerScreenblurFadeIn(1000)
    SetNuiFocus(true, true)
    SendNUIMessage({
        type = "setVisible",
        visible = true
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