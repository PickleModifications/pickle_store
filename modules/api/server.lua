local UserInfo = {}
local AwaitingTransactions = {}
local RedeemingUsers = {}
local PerformingAction = {}

function GetPlayerPrefixIdentifier(source)
    local prefix = Config.IdentifierPrefix
    local identifiers = GetPlayerIdentifiers(source)
    for i=1, #identifiers do
        if string.match(identifiers[i], prefix .. ":") then
            return identifiers[i]
        end
    end
    if prefix == "license2" then
        for i=1, #identifiers do
            if string.match(identifiers[i], "license:") then
                return identifiers[i]
            end
        end
    end  
end

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
    debugPrint("Executing tebex command: " .. command)
    ExecuteCommand(command)
end

function AddTransactionCommand(transactionId, usernameId, redeemCommand)
    MySQL.Async.execute("INSERT INTO `pts_pending_transactions` (`transaction_id`, `fivem_id`, `command`) VALUES (@transaction_id, @fivem_id, @command)", {
        ["@transaction_id"] = transactionId,
        ["@fivem_id"] = usernameId,
        ["@command"] = redeemCommand,
    }, function(rowsChanged)
        debugPrint("Added transaction command for: " .. transactionId, usernameId, redeemCommand)
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
        TriggerClientEvent("pickle_store:setRedeemStatus", AwaitingTransactions[transactionId], true)
        AwaitingTransactions[transactionId] = nil
    end
    for i=1, #rows do
        ExecuteTebexCommand(source, rows[i].command)
    end
    MySQL.Async.execute("DELETE FROM `pts_pending_transactions` WHERE `transaction_id`=@transaction_id;", {["@transaction_id"] = transactionId}, function(rowsChanged)
        debugPrint("Deleted " .. rowsChanged .. " pending transactions for ID:", transactionId)
    end)
    MySQL.Async.execute("INSERT INTO `pts_redeemed_transactions` (`transaction_id`, `identifiers`) VALUES (@transaction_id, @identifiers)", {
        ["@transaction_id"] = transactionId,
        ["@identifiers"] = json.encode(GetPlayerIdentifiers(source)),
    }, function(rowsChanged)
        debugPrint("Added redeemed transaction for: " .. transactionId, UserInfo[source].username_id)
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
            debugPrint("Received response for transaction:", transactionId, json.encode(json.decode(response), { indent = true }))
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

function GetStringPlayer(source)
    local name = GetPlayerName(source)
    name = "**Name:** ".. name .. " (ID: " .. source .. ")\n**Identifiers:**\n`" .. json.encode(GetPlayerIdentifiers(source), {indent = true}) .. "`"
    return name
end

function AddCoins(source, credit, origin)
    local userInfo = UserInfo[source]
    if not userInfo then return end
    userInfo.coins = userInfo.coins + tonumber(credit)
    ConfigSV.WebhookHandler("onCoinAdded", {
        player = GetStringPlayer(source),
        playerCoins = credit,
        origin = origin or "System",
    })
    MySQL.Async.execute("UPDATE `pts_users` SET `coins`=@coins WHERE `identifier`=@identifier;", {
        ["@coins"] = userInfo.coins,
        ["@identifier"] = GetPlayerPrefixIdentifier(source),
    }, function(rowsChanged)
        debugPrint("Added coins for " .. GetPlayerPrefixIdentifier(source) .. " with " .. credit .. " coins.")
        TriggerClientEvent("pickle_store:updatePlayerCoins", source, userInfo.coins)
    end)
end

exports("AddCoins", AddCoins)

function RemoveCoins(source, credit, origin)
    local userInfo = UserInfo[source]
    if not userInfo then return end
    userInfo.coins = userInfo.coins - tonumber(credit)
    if userInfo.coins < 0 then userInfo.coins = 0 end
    if origin then
        ConfigSV.WebhookHandler("onCoinRemoved", {
            player = GetStringPlayer(source),
            playerCoins = credit,
            origin = origin or "System",
        })
    end
    MySQL.Async.execute("UPDATE `pts_users` SET `coins`=@coins WHERE `identifier`=@identifier;", {
        ["@coins"] = userInfo.coins,
        ["@identifier"] = GetPlayerPrefixIdentifier(source),
    }, function(rowsChanged)
        debugPrint("Removed coins for " .. GetPlayerPrefixIdentifier(source) .. " by " .. credit .. " coins.")
        TriggerClientEvent("pickle_store:updatePlayerCoins", source, userInfo.coins)
    end)
end

exports("RemoveCoins", RemoveCoins)

function GetCoins(source)
    local userInfo = UserInfo[source]
    if not userInfo then return 0 end
    return userInfo.coins
end

exports("GetCoins", GetCoins)

function GetUserInfo(source)
    return UserInfo[source]
end

exports("GetUserInfo", GetUserInfo)

function PurchaseProduct(source, productId, rawFields, clientFields)
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
        local additionalFields = clientFields[i] or {}
        additionalFields.productId = productId
        additionalFields.source = source
        local command = GetCustomCommand(product.commands[i], rawFields[i], additionalFields)
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
        local additionalFields = clientFields[i] or {}
        additionalFields.productId = productId
        additionalFields.source = source
        local command = GetCustomCommand(product.commands[i], rawFields[i], additionalFields)
        if command then
            if command.onPurchaseServer then
                debugPrint("Custom coin command execution: " .. json.encode({name = command.name, fields = command.fields}))
                command.onPurchaseServer()
            end
        else
            local commandString = GetCommandReplaced(source, product.commands[i], {productId = productId})
            debugPrint("Executing non-config coin command: " .. commandString)
            ExecuteCommand(commandString)
        end
    end
    ConfigSV.WebhookHandler("onCoinProductPurchase", {
        player = GetStringPlayer(source),
        productId = productId,
        productLabel = product.title,
        coins = product.coins,
        commands = "`" ..json.encode(product.commands, {indent = true}) .. "`",
    })
    ShowNotification(source, _L("purchase_success", product.title, product.coins, tolower(product.coins == 1 and Config.CoinCurrency.singular or Config.CoinCurrency.plural)))
    TriggerClientEvent("pickle_store:purchaseProduct", source, productId, rawFields, clientFields)
end

function UpdateUser(source)
    MySQL.Async.execute("UPDATE `pts_users` SET `coins`=@coins, `spins`=@spins, `nextSpinTime`=@nextSpinTime, `purchases`=@purchases WHERE `identifier`=@identifier;", {
        ["@purchases"] = json.encode(UserInfo[source].purchases or {}) or "[]",
        ["@coins"] = UserInfo[source].coins or 0,
        ["@spins"] = UserInfo[source].spins or 0,
        ["@nextSpinTime"] = UserInfo[source].nextSpinTime or 0,
        ["@identifier"] = GetPlayerPrefixIdentifier(source),
    }, function(rowsChanged)
        debugPrint("Updated user with " .. rowsChanged .. " rows changed.")
    end)
end

function DeleteProduct(productId)
    MySQL.Async.execute("DELETE FROM `pts_products` WHERE `id`=@id;", {["@id"] = productId}, function(rowsChanged)
        debugPrint("Deleted product with " .. rowsChanged .. " rows changed.")
    end)
    ProductInfo[productId] = nil
    TriggerClientEvent("pickle_store:updateProducts", -1, ProductInfo)
end

function UpdateProduct(productId)
    MySQL.Async.execute("UPDATE `pts_products` SET `title`=@title, `description`=@description, `image`=@image, `coins`=@coins, `category`=@category, `globalLimit`=@globalLimit, `userLimit`=@userLimit, `commands`=@commands WHERE `id`=@id;", {
        ["@id"] = productId,
        ["@title"] = ProductInfo[productId].title,
        ["@description"] = ProductInfo[productId].description,
        ["@image"] = ProductInfo[productId].image,
        ["@coins"] = ProductInfo[productId].coins,
        ["@category"] = (ProductInfo[productId].category and ProductInfo[productId].category ~= "") and ProductInfo[productId].category or "all",
        ["@globalLimit"] = ProductInfo[productId].globalLimit,
        ["@userLimit"] = ProductInfo[productId].userLimit,
        ["@commands"] = json.encode(ProductInfo[productId].commands),
    }, function(rowsChanged)
        debugPrint("Updated product with " .. rowsChanged .. " rows changed.")
    end)
    TriggerClientEvent("pickle_store:updateProducts", -1, ProductInfo)
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

function ProcessTebexCommand(transactionId, usernameId, redeemCommand)
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

function GetFiveMUsername(identifier, cb)
    PerformHttpRequest("https://policy-live.fivem.net/api/getUserInfo/"..identifier, function(statusCode, response, headers)
        if statusCode == 200 or statusCode == 201 then
            cb(json.decode(response).username)
        else
            cb(nil)
        end
    end, 'GET', nil)
end

function IsStoreManager(source)
    local identifiers = GetPlayerIdentifiers(source)
    for i=1, #identifiers do
        for j=1, #Config.StoreManagers do
            if identifiers[i] == Config.StoreManagers[j] then
                return true
            end
        end
    end
    return false
end

function ResyncPermissions()
end

lib.callback.register('pickle_store:getPurchaseUrl', function(source, packageId)
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
                debugPrint("Request failed with status code: " .. statusCode)
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

lib.callback.register('pickle_store:redeemTransaction', function(source, transactionId)
    return RedeemTransaction(transactionId, source)
end)

RegisterNetEvent("pickle_store:requestInfo", function()
    if UserInfo[source] then
        return
    end
    local data = {}
    local source = source
    local identifiers = {
        fivem = GetPlayerIdentifierByType(source, "fivem"),
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
    MySQL.Async.fetchAll("SELECT * FROM `pts_users` WHERE `identifier`=@identifier;", {["@identifier"] = GetPlayerPrefixIdentifier(source)}, function(rows)
        if #rows < 1 then
            rows[1] = { coins = 0, spins = 1, nextSpinTime = 0 }
            MySQL.Async.execute("INSERT IGNORE INTO `pts_users` (`identifier`, `fivem_id`, `discord_id`, `coins`, `spins`, `nextSpinTime`) VALUES (@identifier, @fivem_id, @discord_id, @coins, @spins, @nextSpinTime)", {
                ["@identifier"] = GetPlayerPrefixIdentifier(source),
                ["@fivem_id"] = tostring(data.username_id),
                ["@discord_id"] = tostring(data.discord_id),
                ["@coins"] = 0,
                ["@spins"] = 1,
                ["@nextSpinTime"] = 0,
            }, function(rowsChanged)
                debugPrint("Inserted new user with " .. rowsChanged .. " rows changed.")
            end)
        end
        data.coins = rows[1].coins
        data.spins = rows[1].spins
        data.nextSpinTime = rows[1].nextSpinTime
        data.purchases = json.decode(rows[1].purchases) or {}
        data.permissions = {manageProducts = IsStoreManager(source)}
        if data.username_id then
            return GetFiveMUsername(data.username_id, function(username)
                data.username = username
                UserInfo[source] = data
                MySQL.Async.fetchAll("SELECT * FROM `pts_pending_transactions` WHERE `fivem_id`=@fivem_id;", {["@fivem_id"] = UserInfo[source].username_id}, function(rows)
                    for i=1, #rows do
                        ExecuteTebexCommand(source, rows[i].command)
                    end
                    MySQL.Async.execute("DELETE FROM `pts_pending_transactions` WHERE `fivem_id`=@fivem_id;", {["@fivem_id"] = UserInfo[source].username_id}, function(rowsChanged)
                        debugPrint("Deleted " .. rowsChanged .. " pending transactions for ID:", UserInfo[source].username_id)
                    end)
                end)
                TriggerClientEvent("pickle_store:requestInfo", source, data, ProductInfo)
            end)
        end
        UserInfo[source] = data
        TriggerClientEvent("pickle_store:requestInfo", source, data, ProductInfo)
        TriggerClientEvent("pickle_store:setupInventory", source, Inventory.Items)
    end)
end)

RegisterNetEvent("pickle_store:purchaseProduct", function(productId, rawFields, clientFields) 
    local source = source
    if PerformingAction[source] then return end
    PerformingAction[source] = true
    PurchaseProduct(source, productId, rawFields, clientFields)
    PerformingAction[source] = false
end)

RegisterNetEvent("pickle_store:updateProduct", function(id, product)
    local source = source
    if not IsStoreManager(source) then return ShowNotification(source, _L("no_permission")) end
    if not ProductInfo[id or ""] then return end
    ProductInfo[id] = GetProductInfo(product)
    UpdateProduct(id)
end)

RegisterNetEvent("pickle_store:deleteProduct", function(productId)
    local source = source
    if not IsStoreManager(source) then return ShowNotification(source, _L("no_permission")) end
    if not ProductInfo[productId] then return end
    DeleteProduct(productId)
end)

RegisterNetEvent("pickle_store:createProduct", function(product)
    if not IsStoreManager(source) then return ShowNotification(source, _L("no_permission")) end
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
        ["@category"] = (ProductInfo[id].category and ProductInfo[id].category ~= "") and ProductInfo[id].category or "all",
        ["@globalLimit"] = ProductInfo[id].globalLimit,
        ["@userLimit"] = ProductInfo[id].userLimit,
        ["@commands"] = json.encode(ProductInfo[id].commands),
    }, function(rowsChanged)
        debugPrint("Created product with " .. rowsChanged .. " rows changed.")
    end)
    TriggerClientEvent("pickle_store:updateProducts", -1, ProductInfo)
end)

RegisterNetEvent("pickle_store:spinWheel", function()
    local source = source
    local userInfo = UserInfo[source]
    if not userInfo then return end
    if userInfo.spins < 1 then
        local timeLeft = userInfo.nextSpinTime - os.time()
        if timeLeft > 0 then
            ShowNotification(source, _L("spin_cooldown"))
            return
        else
            userInfo.spins = 1
        end
    end
    userInfo.spins = userInfo.spins - 1
    if userInfo.spins <= 0 then
        userInfo.spins = 0
        userInfo.nextSpinTime = os.time() + (Config.DailySpin.cooldown or 86400)
    end
    UpdateUser(source)
    local prizes = Config.DailySpin.prizes
    local totalChance = 0
    for _, prize in ipairs(prizes) do
        totalChance = totalChance + prize.chance
    end

    local rng = math.random() * totalChance
    local cumulativeChance = 0
    local selectedPrizeIndex = nil
    local selectedPrize = nil

    for prizeIndex, prize in ipairs(prizes) do
        cumulativeChance = cumulativeChance + prize.chance
        if rng <= cumulativeChance then
            selectedPrizeIndex = prizeIndex
            selectedPrize = prize
            break
        end
    end
    
    if selectedPrizeIndex then
        local product = prizes[selectedPrizeIndex]
        SetTimeout(5000, function()
            for i=1, #product.commands do
                if not product.commands[i] or #product.commands[i] < 1 then return end
                local command = GetCustomCommand(product.commands[i][1], product.commands[i][2], {productId = productId, source = source}, true)
                if command then
                    if command.onPurchaseServer then
                        debugPrint("Custom coin command execution (daily spin): " .. json.encode({name = command.name, fields = command.fields}))
                        command.onPurchaseServer()
                    end
                else
                    local commandString = GetCommandReplaced(source, product.commands[i][1], {productId = productId})
                    debugPrint("Executing non-config coin command (daily spin): " .. commandString)
                    ExecuteCommand(commandString)
                end
            end
        end)
        TriggerClientEvent("pickle_store:startSpin", source, userInfo.spins, userInfo.nextSpinTime, selectedPrizeIndex)
    end
end)

RegisterCommand("redeem", function(source, args, raw)
    local transactionId = args[1]
    local success, reason = RedeemTransaction(transactionId, source)
    ShowNotification(source, reason)
end)

RegisterCommand("pts_command", function(source, args, raw)
    if not (source == 0 and args) then return end
    local transactionId = args[1]
    local usernameId = tonumber(args[2]) or nil
    local redeemCommand = GetRedeemCommand(args)
    local target = GetPlayerFromFiveMId(usernameId)
    if target then
        return ExecuteTebexCommand(target, redeemCommand)
    end
    AddTransactionCommand(transactionId, usernameId, redeemCommand)
end, false)

RegisterCommand("givecoins", function(source, args, raw)
    if not IsStoreManager(source) then return ShowNotification(source, _L("no_permission")) end
    if #args < 2 then return ShowNotification(source, "Usage: /givecoins id amount") end
    local target = args[1] == "me" and source or GetPlayerFromFiveMId(tonumber(args[1]))
    local credit = tonumber(args[2])
    if not target or not credit then return end
    AddCoins(target, credit, GetStringPlayer(source))
end, false)

RegisterCommand("removecoins", function(source, args, raw)
    if not IsStoreManager(source) then return ShowNotification(source, _L("no_permission")) end
    if #args < 2 then return ShowNotification(source, "Usage: /removecoins id amount") end
    local target = args[1] == "me" and source or GetPlayerFromFiveMId(tonumber(args[1]))
    local credit = tonumber(args[2])
    if not target or not credit then return end
    RemoveCoins(target, credit, GetStringPlayer(source))
end, false)

for i=1, #Config.ExternalTebexCommands do 
    RegisterCommand(Config.ExternalTebexCommands[i], function(source, args, raw)
        if (source ~= 0 or #args < 1) then return end
        for i=1, #args do 
            if string.sub(args[i], 1, 4) == "tbx-" then
                if AwaitingTransactions[args[i]] then
                    TriggerClientEvent("pickle_store:setRedeemStatus", AwaitingTransactions[args[i]], true)
                    AwaitingTransactions[args[i]] = nil
                end
                break
            end
        end
    end, false)
end

for i=1, #Config.Advertisements do 
    lib.cron.new(Config.Advertisements[i].interval, function()
        TriggerClientEvent(GetCurrentResourceName()..":showNotification", -1, Config.Advertisements[i].message)
    end)
end

for k,v in pairs(Config.CustomCommands) do 
    if v.tebexCommand then
        RegisterCommand(k, function(source, args, raw)
            if (source ~= 0) then return end
            v.tebexCommand(args, raw)
        end, false)
    end
end

MySQL.ready(function()
    MySQL.Async.execute("CREATE TABLE IF NOT EXISTS `pts_pending_transactions` (`id` INT PRIMARY KEY AUTO_INCREMENT, `transaction_id` VARCHAR(255), `fivem_id` INT, `command` LONGTEXT)", {}, function(rowsChanged)
        if rowsChanged > 0 then debugPrint("Created table `pts_pending_transactions` with " .. rowsChanged .. " rows changed.") end
    end)
    MySQL.Async.execute("CREATE TABLE IF NOT EXISTS `pts_redeemed_transactions` (`id` INT PRIMARY KEY AUTO_INCREMENT, `transaction_id` VARCHAR(255), `identifiers` LONGTEXT)", {}, function(rowsChanged)
        if rowsChanged > 0 then debugPrint("Created table `pts_redeemed_transactions` with " .. rowsChanged .. " rows changed.") end
    end)
    MySQL.Async.execute("CREATE TABLE IF NOT EXISTS `pts_users` (`identifier` VARCHAR(255) PRIMARY KEY, `fivem_id` VARCHAR(255), `discord_id` VARCHAR(255), `coins` INT, `spins` INT, `nextSpinTime` INT, `purchases` LONGTEXT)", {}, function(rowsChanged)
        if rowsChanged > 0 then debugPrint("Created table `pts_users` with " .. rowsChanged .. " rows changed.") end
    end)
    MySQL.Async.execute("CREATE TABLE IF NOT EXISTS `pts_products` ( `id` VARCHAR(255) PRIMARY KEY, `title` varchar(255) NOT NULL, `description` longtext NOT NULL, `image` longtext NOT NULL, `coins` int(11) NOT NULL DEFAULT 0, `globalLimit` int(11) DEFAULT 0, `userLimit` int(11) DEFAULT 0, `category` longtext DEFAULT NULL, `commands` longtext DEFAULT NULL )", {}, function(rowsChanged)
        if rowsChanged > 0 then debugPrint("Created table `pts_products` with " .. rowsChanged .. " rows changed.") end
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
            if #rows == 0 and Config.InsertDefaultProducts then
                MySQL.Async.execute([[INSERT INTO `pts_products` (`id`, `title`, `description`, `image`, `coins`, `globalLimit`, `userLimit`, `category`, `commands`) VALUES
                    ('coin_1738458644_2634', 'Adder', 'This is the fastest vehicle in the game, go ahead and get it now!', 'https://docs.fivem.net/vehicles/adder.webp', 100, 0, 0, 'Vehicles', '["pts_givecar adder"]'),
                    ('coin_1738458758_8130', 'Pistol', 'A deadly weapon used to take out the opposition.', 'nui://ox_inventory/web/images/weapon_pistol.png', 150, 0, 0, 'Weapons', '["pts_giveitem weapon_pistol 1"]'),
                    ('coin_1738458876_4812', 'Water', 'Tastes pretty good, not bad at all!', 'nui://ox_inventory/web/images/water.png', 5, 0, 0, 'Food & Water', '["pts_giveitem water 1"]'),
                    ('coin_1738458912_5476', 'Burger', 'I like burgers.', 'nui://ox_inventory/web/images/burger.png', 5, 0, 0, 'Food & Water', '["pts_giveitem burger 1"]'),
                    ('coin_1738459265_5495', 'Ammo (9mm)', 'You will recieve 100 bullets for your pistols.', 'nui://ox_inventory/web/images/ammo-9.png', 10, 0, 0, 'Weapons', '["pts_giveitem ammo-9 100"]'),
                    ('coin_1738460206_5915', 'Plate Change', 'Change your current vehicle\'s plate!', 'images/plate.png', 50, 0, 0, 'Vehicles', '["pts_plate"]'),
                    ('coin_1738460552_3162', 'Job - Police Officer', 'Become an officer today!', 'https://docs.fivem.net/peds/s_m_y_cop_01.webp', 200, 0, 0, 'Jobs', '["pts_setjob police 0"]'),
                    ('coin_1738460682_5319', 'Whippet (Grape)', 'No description provided.', 'nui://ox_inventory/web/images/n2o_grape.png', 25, 0, 0, 'Drugs', '["pts_giveitem n2o_grape"]'),
                    ('coin_1738460835_7052', 'Whippet (Strawberry)', 'No description provided.', 'nui://ox_inventory/web/images/n2o_strawberry.png', 25, 0, 0, 'Drugs', '["pts_giveitem n2o_strawberry 1"]'),
                    ('coin_1738461475_6122', 'Job - Paramedic', 'Become a paramedic today!', 'https://docs.fivem.net/peds/s_m_m_doctor_01.webp', 200, 0, 0, 'Jobs', '["pts_setjob ambulance 0"]'),
                    ('coin_1738462156_9043', 'Yacht (1-of-1 Exclusive) ', 'I think this yacht is pretty cool - and it can be yours and yours only!', 'https://docs.fivem.net/vehicles/marquis.webp', 25, 1, 0, 'Vehicles', '["pts_givecar marquis"]');
                ]], {}, function(rowsChanged)
                    debugPrint("Inserted default products with " .. rowsChanged .. " rows changed.")
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
                        TriggerClientEvent("pickle_store:updateProducts", -1, ProductInfo)
                    end)
                end)
            end
        end)
    end)
end)