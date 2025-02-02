function UpdateCoins(coins)
    LOCAL_DATA.coins = coins
    SendNUIMessage({
        type = "updatePlayerCoins",
        coins = coins
    })
end

function ResyncPermissions()
end

RegisterNetEvent("pickle_store:purchaseProduct", function(productId, commandArgs, clientArgs)
    local product = (type(productId) == "table" and productId or ProductInfo[productId])
    if not product then return end
    if #product.commands < 1 then return ShowNotification(_L("no_action")) end
    for i=1, #product.commands do
        local additionalFields = clientArgs[i] or {}
        if type(productId) ~= "table" then
            additionalFields.productId = productId
        end
        local command = GetCustomCommand(product.commands[i], commandArgs[i], additionalFields)
        if command and command.onPurchaseClient then
            command.onPurchaseClient()
        end
    end
end)

RegisterNetEvent("pickle_store:updateProducts", function(products)
    ProductInfo = products
    SendNUIMessage({
        type = "updateProductInfo",
        productInfo = GetProductInfoArray()
    })
end)