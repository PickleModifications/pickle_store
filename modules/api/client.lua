function UpdateCoins(coins)
    LOCAL_DATA.coins = coins
    SendNUIMessage({
        type = "updatePlayerCoins",
        coins = coins
    })
end

RegisterNetEvent("pickle_tebexstore:purchaseProduct", function(productId, commandArgs)
    local product = ProductInfo[productId]
    if not product then return end
    if #product.commands < 1 then return ShowNotification(_L("no_action")) end
    for i=1, #product.commands do
        local command = GetCustomCommand(product.commands[i], commandArgs[i], {productId = productId})
        if command and command.onPurchaseClient then
            command.onPurchaseClient()
        end
    end
end)

RegisterNetEvent("pickle_tebexstore:updateProducts", function(products)
    ProductInfo = products
    for k,v in pairs(products) do
        print(json.encode(v))
    end
    SendNUIMessage({
        type = "updateProductInfo",
        productInfo = GetProductInfoArray()
    })
end)