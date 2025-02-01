local UserInfo = {}
local AwaitingTransactions = {}
local RedeemingUsers = {}
local PerformingAction = {}

function GenerateProductId()
    local id = nil
    repeat
        id = "coin_" .. os.time() .. "_" .. math.random(1, 9999)
    until not ProductInfo[id]
    return id
end

function GetCommandReplaced(source, command, otherReplacements)
    local replacements = {
        ["{pts_server_id}"] = source,
    }
    for k,v in pairs(otherReplacements or {}) do
        replacements[k] = v
    end
    for k,v in pairs(replacements) do
        command = string.gsub(command, k, v)
    end
    return command
end

function ExecuteTebexCommand(source, command)
    local command = GetCommandReplaced(source, command)
    print("Executing tebex command: " .. command)
    ExecuteCommand(command)
end

function AddTransactionCommand(transactionId, usernameId, redeemCommand)
    MySQL.Async.execute("INSERT INTO `pts_pending_transactions` (`transaction_id`, `fivem_id`, `command`) VALUES (@transaction_id, @fivem_id, @command)", {
        ["@transaction_id"] = transactionId,
        ["@fivem_id"] = usernameId,
        ["@command"] = redeemCommand,
    }, function(rowsChanged)
        print("Added transaction command for: " .. transactionId, usernameId, redeemCommand)
    end)
end

function GetPlayerFromFiveMId(fivemId)
    for k,v in pairs(UserInfo) do
        if v.username_id == fivemId then
            return k
        end
    end
    return nil
end

function GetRedeemCommand(args)
    if #args < 3 then return end
    local redeemCommand = ""
    for i=3, #args do
        redeemCommand = redeemCommand .. args[i] .. (i == #args and "" or " ")
    end
    return redeemCommand
end

function RedeemVerifiedTransaction(transactionId, source, rows) 
    if AwaitingTransactions[transactionId] then
        TriggerClientEvent("pickle_tebexstore:setRedeemStatus", AwaitingTransactions[transactionId], true)
        AwaitingTransactions[transactionId] = nil
    end
    for i=1, #rows do
        ExecuteTebexCommand(source, rows[i].command)
    end
    MySQL.Async.execute("DELETE FROM `pts_pending_transactions` WHERE `transaction_id`=@transaction_id;", {["@transaction_id"] = transactionId}, function(rowsChanged)
        print("Deleted " .. rowsChanged .. " pending transactions for ID:", transactionId)
    end)
    MySQL.Async.execute("INSERT INTO `pts_redeemed_transactions` (`transaction_id`, `identifiers`) VALUES (@transaction_id, @identifiers)", {
        ["@transaction_id"] = transactionId,
        ["@identifiers"] = json.encode(GetPlayerIdentifiers(source)),
    }, function(rowsChanged)
        print("Added redeemed transaction for: " .. transactionId, UserInfo[source].username_id)
    end)
end

function isStringEmpty(str)
    return str == nil or str == "" or str:match("^%s*$") ~= nil
end

function RedeemTransaction(transactionId, source)
    local userInfo = UserInfo[source]
    if RedeemingUsers[source] then return false, _L("already_redeeming") end
    if (not transactionId or isStringEmpty(transactionId)) or not userInfo then return false, _L("invalid_transaction_id") end
    RedeemingUsers[source] = true
    local responseReceived = false
    local result = false
    local reason = "Unknown"
    PerformHttpRequest("https://plugin.tebex.io/payments/"..transactionId, function(statusCode, response, headers)
        if statusCode == 200 or statusCode == 201 then
            print("Received response for transaction:", transactionId, json.encode(json.decode(response), { indent = true }))
            MySQL.Async.fetchAll("SELECT * FROM `pts_pending_transactions` WHERE `transaction_id`=@transaction_id;", {["@transaction_id"] = transactionId}, function(rows)
                if #rows > 0 then
                    RedeemVerifiedTransaction(transactionId, source, rows)
                    result = true
                    reason = _L("redeemed_transaction", #rows)
                    responseReceived = true
                else 
                    MySQL.Async.fetchAll("SELECT * FROM `pts_redeemed_transactions` WHERE `transaction_id`=@transaction_id;", {["@transaction_id"] = transactionId}, function(rows)
                        if #rows > 0 then
                            result = false
                            reason = _L("invalid_redeemed_transaction")
                        else
                            result = false
                            reason = _L("invalid_transaction_processing")
                            AwaitingTransactions[transactionId] = source
                        end
                        responseReceived = true
                    end)
                end
            end)
        else
            result = false
            reason = _L("invalid_transaction_id")
            responseReceived = true
        end
    end, 'GET', "", { 
        ['X-Tebex-Secret'] = GetConvar("sv_tebexSecret", "UNKNOWN"),
        ['Content-Type'] = 'application/json' 
    })
    while not responseReceived do
        Wait(0)
    end
    RedeemingUsers[source] = false
    return result, reason
end

function AddCoins(source, credit)
    local userInfo = UserInfo[source]
    if not userInfo then return end
    userInfo.coins = userInfo.coins + tonumber(credit)
    MySQL.Async.execute("UPDATE `pts_users` SET `coins`=@coins WHERE `identifier`=@identifier;", {
        ["@coins"] = userInfo.coins,
        ["@identifier"] = GetPlayerIdentifierByType(source, Config.IdentifierPrefix),
    }, function(rowsChanged)
        print("Added coins for " .. GetPlayerIdentifierByType(source, Config.IdentifierPrefix) .. " with " .. credit .. " coins.")
        TriggerClientEvent("pickle_tebexstore:updatePlayerCoins", source, userInfo.coins)
    end)
end

function RemoveCoins(source, credit)
    local userInfo = UserInfo[source]
    if not userInfo then return end
    userInfo.coins = userInfo.coins - tonumber(credit)
    MySQL.Async.execute("UPDATE `pts_users` SET `coins`=@coins WHERE `identifier`=@identifier;", {
        ["@coins"] = userInfo.coins,
        ["@identifier"] = GetPlayerIdentifierByType(source, Config.IdentifierPrefix),
    }, function(rowsChanged)
        print("Removed coins for " .. GetPlayerIdentifierByType(source, Config.IdentifierPrefix) .. " by " .. credit .. " coins.")
        TriggerClientEvent("pickle_tebexstore:updatePlayerCoins", source, userInfo.coins)
    end)
end

function PurchaseProduct(source, productId, rawFields)
    local source = source
    local product = ProductInfo[productId]
    local userInfo = UserInfo[source]
    if not userInfo then return ShowNotification(source, _L("no_user_data")) end
    if not product then return ShowNotification(source, _L("product_not_exist")) end
    if #product.commands < 1 then return ShowNotification(source, _L("no_action")) end
    if userInfo.coins < product.coins then return ShowNotification(source, _L("insufficient_coins", product.coins - userInfo.coins, tolower(Config.CoinCurrency.plural))) end
    if product.userLimit > 0 then
        local paymentCount = userInfo.purchases[productId] or 0
        if paymentCount >= product.userLimit then return ShowNotification(source, _L("user_purchase_limit_reached")) end
    end
    for i=1, #product.commands do
        local command = GetCustomCommand(product.commands[i], rawFields[i], {productId = productId, source = source})
        if command and command.purchaseCheckServer then
            local success, reason = command.purchaseCheckServer()
            if not success then return ShowNotification(source, _L("cancel_command_failed", reason or "Unknown Reason")) end
        end
    end
    RemoveCoins(source, product.coins)
    if product.userLimit > 0 then
        userInfo.purchases[productId] = (userInfo.purchases[productId] or 0) + 1
        UpdateUser(source)
    end
    if product.globalLimit > 0 then
        product.globalLimit = product.globalLimit - 1
        if product.globalLimit == 0 then
            DeleteProduct(productId)
        else
            UpdateProduct(productId)
        end
    end
    for i=1, #product.commands do
        local command = GetCustomCommand(product.commands[i], rawFields[i], {productId = productId, source = source})
        if command then
            if command.onPurchaseServer then
                print("Custom coin command execution: " .. json.encode({name = command.name, fields = command.fields}))
                command.onPurchaseServer()
            end
        else
            local commandString = GetCommandReplaced(source, product.commands[i], {productId = productId})
            print("Executing non-config coin command: " .. commandString)
            ExecuteCommand(commandString)
        end
    end
    ShowNotification(source, _L("purchase_success", product.title, product.coins, tolower(product.coins == 1 and Config.CoinCurrency.singular or Config.CoinCurrency.plural)))
    TriggerClientEvent("pickle_tebexstore:purchaseProduct", source, productId, rawFields)
end

function UpdateUser(source)
    MySQL.Async.execute("UPDATE `pts_users` SET `coins`=@coins, `purchases`=@purchases WHERE `identifier`=@identifier;", {
        ["@purchases"] = json.encode(UserInfo[source].purchases),
        ["@coins"] = UserInfo[source].coins,
        ["@identifier"] = GetPlayerIdentifierByType(source, Config.IdentifierPrefix),
    }, function(rowsChanged)
        print("Updated user with " .. rowsChanged .. " rows changed.")
    end)
end

function DeleteProduct(productId)
    MySQL.Async.execute("DELETE FROM `pts_products` WHERE `id`=@id;", {["@id"] = productId}, function(rowsChanged)
        print("Deleted product with " .. rowsChanged .. " rows changed.")
    end)
    ProductInfo[productId] = nil
    TriggerClientEvent("pickle_tebexstore:updateProducts", -1, ProductInfo)
end

function UpdateProduct(productId)
    MySQL.Async.execute("UPDATE `pts_products` SET `title`=@title, `description`=@description, `image`=@image, `coins`=@coins, `category`=@category, `globalLimit`=@globalLimit, `userLimit`=@userLimit, `commands`=@commands WHERE `id`=@id;", {
        ["@id"] = productId,
        ["@title"] = ProductInfo[productId].title,
        ["@description"] = ProductInfo[productId].description,
        ["@image"] = ProductInfo[productId].image,
        ["@coins"] = ProductInfo[productId].coins,
        ["@category"] = ProductInfo[productId].category,
        ["@globalLimit"] = ProductInfo[productId].globalLimit,
        ["@userLimit"] = ProductInfo[productId].userLimit,
        ["@commands"] = json.encode(ProductInfo[productId].commands),
    }, function(rowsChanged)
        print("Updated product with " .. rowsChanged .. " rows changed.")
    end)
    TriggerClientEvent("pickle_tebexstore:updateProducts", -1, ProductInfo)
end

function GetProductInfo(product)
    product.base_price = tonumber(product.base_price or "")
    product.globalLimit = tonumber(product.globalLimit or "")
    product.userLimit = tonumber(product.userLimit or "")
    return {
        title = product.name ~= "" and product.name or "Untitled Product",
        description = product.description ~= "" and product.description or "No description provided.",
        image = product.image or "",
        coins = (product.base_price and product.base_price > 0) and product.base_price or 0,
        category = product.category or "all",
        globalLimit = (product.globalLimit and product.globalLimit > 0) and product.globalLimit or 0,
        userLimit = (product.userLimit and product.userLimit > 0) and product.userLimit or 0,
        commands = product.commands or {}
    }
end

RegisterNetEvent("pickle_tebexstore:purchaseProduct", function(productId, rawFields) 
    local source = source
    if PerformingAction[source] then return end
    PerformingAction[source] = true
    PurchaseProduct(source, productId, rawFields)
    PerformingAction[source] = false
end)

RegisterNetEvent("pickle_tebexstore:updateProduct", function(id, product)
    if not ProductInfo[id or ""] then return end
    ProductInfo[id] = GetProductInfo(product)
    UpdateProduct(id)
end)

RegisterNetEvent("pickle_tebexstore:deleteProduct", function(productId)
    if not ProductInfo[productId] then return end
    DeleteProduct(productId)
end)

RegisterNetEvent("pickle_tebexstore:createProduct", function(product)
    local id = GenerateProductId()
    if ProductInfo[id] then return end
    product.base_price = tonumber(product.base_price or "")
    product.globalLimit = tonumber(product.globalLimit or "")
    product.userLimit = tonumber(product.userLimit or "")
    ProductInfo[id] = GetProductInfo(product)
    MySQL.Async.execute("INSERT INTO `pts_products` (`id`, `title`, `description`, `image`, `coins`, `category`, `globalLimit`, `userLimit`, `commands`) VALUES (@id, @title, @description, @image, @coins, @category, @globalLimit, @userLimit, @commands);", {
        ["@id"] = id,
        ["@title"] = ProductInfo[id].title,
        ["@description"] = ProductInfo[id].description,
        ["@image"] = ProductInfo[id].image,
        ["@coins"] = ProductInfo[id].coins,
        ["@category"] = ProductInfo[id].category,
        ["@globalLimit"] = ProductInfo[id].globalLimit,
        ["@userLimit"] = ProductInfo[id].userLimit,
        ["@commands"] = json.encode(ProductInfo[id].commands),
    }, function(rowsChanged)
        print("Created product with " .. rowsChanged .. " rows changed.")
    end)
    TriggerClientEvent("pickle_tebexstore:updateProducts", -1, ProductInfo)
end)

RegisterCommand("redeem", function(source, args, raw)
    local transactionId = args[1]
    local success, reason = RedeemTransaction(transactionId, source)
    ShowNotification(source, reason)
end)

RegisterCommand("pts_addcoins", function(source, args, raw)
    print("RUNNING pts_addcoins!!!")
    if not (source == 0 and args) then return end
    if tonumber(args[1]) then 
        -- Give to player directly.
        local target = tonumber(args[1])
        local credit = tonumber(args[2])
        if not target or not credit then print("Invalid args for pts_addcoins (game):", target, credit) return end
        AddCoins(target, credit)
    else
        -- Give to player offline.
        local transactionId = args[1]
        local usernameId = tonumber(args[2]) or nil
        local credit = tonumber(args[3])
        if not transactionId or not credit then print("Invalid args for pts_addcoins (tebex):", transactionId, credit) return end
        local redeemCommand = "pts_addcoins {pts_server_id} " .. credit
        for k,v in pairs(AwaitingTransactions) do
            if k == transactionId then
                RedeemVerifiedTransaction(transactionId, v, {{ command = redeemCommand }})
                return
            end
        end
        for k,v in pairs(UserInfo) do 
            if v.username_id and v.username_id == usernameId then
                RedeemVerifiedTransaction(transactionId, k, {{ command = redeemCommand }})
                return
            end
        end
        AddTransactionCommand(transactionId, usernameId, redeemCommand)
    end

    -- They are offline, send to pending.

end, false)

RegisterCommand("pts_giveitem", function(source, args, raw)
    if not (source == 0 and args) then return end
    local target = tonumber(args[1])

    local item = args[2]
    local amount = tonumber(args[3])
    Inventory.AddItem(target, item, amount, json.decode(args[4] or "{}"))
end)

RegisterCommand("pts_command", function(source, args, raw)
    print("RUNNING CMD!!!", raw)
    if not (source == 0 and args) then return end
    local transactionId = args[1]
    local usernameId = tonumber(args[2]) or nil
    local redeemCommand = GetRedeemCommand(args)
    local target = GetPlayerFromFiveMId(usernameId)
    -- if target then
    --     return ExecuteTebexCommand(target, redeemCommand)
    -- end
    AddTransactionCommand(transactionId, usernameId, redeemCommand)
end, false)

function GetFiveMUsername(identifier, cb)
    PerformHttpRequest("https://policy-live.fivem.net/api/getUserInfo/"..identifier, function(statusCode, response, headers)
        if statusCode == 200 or statusCode == 201 then
            cb(json.decode(response).username)
        else
            cb(nil)
        end
    end, 'GET', nil)
end

lib.callback.register('pickle_tebexstore:getPurchaseUrl', function(source, packageId)
    local tebexResult = nil
    local responseReceived = false
    PerformHttpRequest("https://plugin.tebex.io/payments/fields/"..packageId, function(statusCode, response, headers)
        local fields = json.decode(response) or {}
        tebexResult = { directCheckout = (#fields > 0) }
        if (Config.HeadlessTebexStore and not tebexResult.directCheckout) or not UserInfo[source] or not UserInfo[source].username then
            responseReceived = true
            return
        end
        PerformHttpRequest("https://plugin.tebex.io/checkout", function(statusCode, response, headers)
            responseReceived = true
            if statusCode == 200 or statusCode == 201 then
                tebexResult.url = json.decode(response).url
            else
                print("Request failed with status code: " .. statusCode)
            end
        end, 'POST', json.encode({
            package_id = packageId,
            username = UserInfo[source].username,
        }), { 
            ['X-Tebex-Secret'] = GetConvar("sv_tebexSecret", "UNKNOWN"),
            ['Content-Type'] = 'application/json' 
        })
    end, 'GET', "", { 
        ['X-Tebex-Secret'] = GetConvar("sv_tebexSecret", "UNKNOWN"),
        ['Content-Type'] = 'application/json' 
    })
    while not responseReceived do
        Wait(0)
    end
    return tebexResult
end)

lib.callback.register('pickle_tebexstore:redeemTransaction', function(source, transactionId)
    return RedeemTransaction(transactionId, source)
end)

RegisterNetEvent("pickle_tebexstore:requestInfo", function()
    if UserInfo[source] then
        return
    end
    local data = {}
    data.productInfo = ProductInfo
    local source = source
    local identifiers = {
        fivem = GetPlayerIdentifierByType(source, "fivem") or ("fivem:" .. 8306616),
        discord = GetPlayerIdentifierByType(source, "discord"),
    }
    if identifiers.discord then
        local str = string.gsub(identifiers.discord, "discord:", "")
        data.discord_id = tonumber(str)
    end
    if identifiers.fivem then
        local str = string.gsub(identifiers.fivem, "fivem:", "")
        data.username_id = tonumber(str)
    end
    MySQL.Async.fetchAll("SELECT * FROM `pts_users` WHERE `identifier`=@identifier;", {["@identifier"] = GetPlayerIdentifierByType(source, Config.IdentifierPrefix)}, function(rows)
        if #rows < 1 then
            rows[1] = { coins = 0 }
            MySQL.Async.execute("INSERT IGNORE INTO `pts_users` (`identifier`, `fivem_id`, `discord_id`, `coins`) VALUES (@identifier, @fivem_id, @discord_id, @coins)", {
                ["@identifier"] = GetPlayerIdentifierByType(source, Config.IdentifierPrefix),
                ["@fivem_id"] = tostring(data.username_id),
                ["@discord_id"] = tostring(data.discord_id),
                ["@coins"] = 0,
            }, function(rowsChanged)
                print("Inserted new user with " .. rowsChanged .. " rows changed.")
            end)
        end
        data.coins = rows[1].coins
        data.purchases = json.decode(rows[1].purchases) or {}
        if data.username_id then
            return GetFiveMUsername(data.username_id, function(username)
                data.username = username
                UserInfo[source] = data
                -- MySQL.Async.fetchAll("SELECT * FROM `pts_pending_transactions` WHERE `fivem_id`=@fivem_id;", {["@fivem_id"] = UserInfo[source].username_id}, function(rows)
                --     for i=1, #rows do
                --         ExecuteTebexCommand(source, command)
                --     end
                --     MySQL.Async.execute("DELETE FROM `pts_pending_transactions` WHERE `fivem_id`=@fivem_id;", {["@fivem_id"] = UserInfo[source].username_id}, function(rowsChanged)
                --         print("Deleted " .. rowsChanged .. " pending transactions for ID:", UserInfo[source].username_id)
                --     end)
                -- end)
                TriggerClientEvent("pickle_tebexstore:requestInfo", source, data)
            end)
        end
        UserInfo[source] = data
        TriggerClientEvent("pickle_tebexstore:requestInfo", source, data)
    end)
end)

MySQL.ready(function()
    MySQL.Async.execute("CREATE TABLE IF NOT EXISTS `pts_pending_transactions` (`id` INT PRIMARY KEY AUTO_INCREMENT, `transaction_id` VARCHAR(255), `fivem_id` INT, `command` LONGTEXT)", {}, function(rowsChanged)
        if rowsChanged > 0 then print("Created table `pts_pending_transactions` with " .. rowsChanged .. " rows changed.") end
    end)
    MySQL.Async.execute("CREATE TABLE IF NOT EXISTS `pts_redeemed_transactions` (`id` INT PRIMARY KEY AUTO_INCREMENT, `transaction_id` VARCHAR(255), `identifiers` LONGTEXT)", {}, function(rowsChanged)
        if rowsChanged > 0 then print("Created table `pts_redeemed_transactions` with " .. rowsChanged .. " rows changed.") end
    end)
    MySQL.Async.execute("CREATE TABLE IF NOT EXISTS `pts_users` (`identifier` VARCHAR(255) PRIMARY KEY, `fivem_id` VARCHAR(255), `discord_id` VARCHAR(255), `coins` INT, `purchases` LONGTEXT)", {}, function(rowsChanged)
        if rowsChanged > 0 then print("Created table `pts_users` with " .. rowsChanged .. " rows changed.") end
    end)
    MySQL.Async.execute("CREATE TABLE IF NOT EXISTS `pts_products` ( `id` VARCHAR(255) PRIMARY KEY, `title` varchar(255) NOT NULL, `description` longtext NOT NULL, `image` longtext NOT NULL, `coins` int(11) NOT NULL DEFAULT 0, `globalLimit` int(11) DEFAULT 0, `userLimit` int(11) DEFAULT 0, `category` longtext DEFAULT NULL, `commands` longtext DEFAULT NULL )", {}, function(rowsChanged)
        if rowsChanged > 0 then print("Created table `pts_products` with " .. rowsChanged .. " rows changed.") end
        MySQL.Async.fetchAll("SELECT * FROM `pts_products`;", {}, function(rows)
            for i=1, #rows do
                local id = (tonumber(rows[i].id) ~= nil and tonumber(rows[i].id) or rows[i].id)
                ProductInfo[id] = {
                    title = rows[i].title,
                    description = rows[i].description,
                    image = rows[i].image,
                    coins = rows[i].coins,
                    category = rows[i].category,
                    globalLimit = rows[i].globalLimit,
                    userLimit = rows[i].userLimit,
                    commands = json.decode(rows[i].commands) or {},
                }
            end
        end)
    end)
end)