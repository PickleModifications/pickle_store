Config = {}
Config.Language = "en"
Config.Debug = false -- This enables debugging prints.
Config.DisableIPIdentifier = false -- This disables the IP identifier when logging players.
Config.DisableAllProductsCategory = false -- This disables the all products category from being shown in the store to non-managers.
Config.IdentifierColumn = "player_identifier" -- This is the column in the database that stores the player's identifier.
-- REQUIRED TO CHANGE:
Config.Theme = "dark" -- "dark", "light", "pickle", "midnight", "red"
Config.ItemImageFolder = "nui://ox_inventory/web/images" -- Don't put a slash at the end.
Config.TebexStoreUrl = "SET_URL_HERE" -- Your Tebex store URL. This is required for the store to function if they are not logged in.
Config.TebexApiKey = "SET_PUBLIC_KEY_HERE" -- Your Tebex Public API key (This is "Public Key" from https://creator.tebex.io/developers/api-keys).
Config.IdentifierPrefix = "license2" -- Don't change this unless you are alright with all existing coin accounts being reset.
Config.HeadlessTebexStore = false -- This should only be true if your tebex template is forcibly redirected to an external website (headless). This will return any checkout basket URL to the store URL.
Config.InsertDefaultProducts = true -- If true, the default products will be inserted into the database on startup.
Config.StoreManagers = { -- These are the people that can manage the store and see the hidden products.
    "steam:EXAMPLE",
    "license:EXAMPLE",
    "fivem:EXAMPLE",
    "discord:EXAMPLE",
}
Config.CoinCurrency = {
    singular = "Diamond",
    plural = "Diamonds",
    image = "images/diamonds.png",
    packages = { -- These are the coin package IDs on your tebex. Add coin packages at https://creator.tebex.io/packages
        6661855,
        6661856,
        6661857,
        6661858,
        6661859,
    }
}
-- RECCOMENDED TO CHANGE:
Config.DailySpin = {
    cooldown = 86400, -- 24 hours in seconds.
    prizes = { -- Make sure the chances add up to 100%
        {
            text = "100 Diamonds", 
            commands = { 
                {"pts_givecoins 100", {}} 
            }, 
            image = Config.CoinCurrency.image, 
            chance = 1 -- 1% chance.
        },
        {
            text = "Adder", 
            commands = { 
                {"pts_givecar adder", {}} 
            }, 
            image = "https://docs.fivem.net/vehicles/adder.webp", 
            chance = 5 -- 5% chance.
        },
        {
            text = "Pistol", 
            commands = { 
                {"pts_giveitem weapon_pistol 1", {}}
            }, 
            image = Config.ItemImageFolder .. "/weapon_pistol.png", 
            chance = 14 -- 14% chance.
        },
        {
            text = "x10 Soda", 
            commands = { 
                {"pts_giveitem soda 10", {}}
            }, 
            image = Config.ItemImageFolder .. "/soda.png", 
            chance = 25  -- 25% chance.
        },
        {
            text = "x10 Burger", 
            commands = { 
                {"pts_giveitem burger 10", {}}
            }, 
            image = Config.ItemImageFolder .. "/burger.png", 
            chance = 25 -- 25% chance.
        },
        {
            text = "x10 Water", 
            commands = { 
                {"pts_giveitem water 10", {}}
            }, 
            image = Config.ItemImageFolder .. "/water.png", 
            chance = 25 -- 25% chance.
        },
    }
}
-- OPTIONAL TO CHANGE:
Config.HiddenPackages = { -- These are the packages that are hidden from the store. Coin packages are automatically added here.
    --6661855,
    --6661856,
    --6661857,
    --6661858,
    --6661859,
}
Config.CustomPages = { -- These are the custom pages that can be accessed from the store.
    {
        label = "Terms of Service",
        content = [[
            <div>
                <div class="font-bold text-xl">Terms of Service</div>
                <div class="text-zinc-600">Last updated: 01/17/2025</div>
                <div class="font-bold text-md">Section 1: General Agreements</div>
                <ol class="list-decimal ml-6">
                    <li>By using this store you agree to all sections and terms within the Terms of Service (this agreement).</li>
                </ol>
                <div class="font-bold text-md">Section 2: Tebex / Store Agreements</div>
                <ol class="list-decimal ml-6">
                    <li>You agree to the Tebex Terms of Service and Privacy Policy.</li>
                    <li>Products purchased are as-is, and the asset's creator(s) hold no liability for damages, maintainence, or providance of products or services is waived.</li>
                    <li>There are no refunds for any reason, however the asset&apos;s creator may waive this and process a refund at-will of the creator(s).</li>
                </ol>
            </div>   
        ]]
    }
}
Config.Advertisements = { -- These are the advertisements that will be displayed in the game.
    {
        interval = "*/5 * * * *", -- See more about cron format at: https://crontab.guru/
        message = "Need more coins? Visit the store by doing /store in the chat."
    },
}
Config.ExternalTebexCommands = {
    -- These are commands that when redeemed, will inform the user when the package's commands have been ran.
    -- You DO NOT need to do this, only if you want to inform the user when their order's package has sent the commands you list here.
    "add_character_slot", -- This is used as the example tebex package in the video! Doesn't have any function.
}
-- NO TOUCHING BELOW THIS LINE UNLESS YOU ACCEPT THAT SUPPORT WILL NOT BE GIVEN FOR MODIFICATIONS BELOW THIS LINE.
Config.CustomCommands = { -- These are the custom commands you can create, modify and delete. These are used in coin packages, as well as
    ["pts_plate"] = {
        label = "Change Plate", -- This will display on top of the purchase button if fields are required.
        commandParameters = "", -- This is the format of the command parameters that added to a coin product. {model} in this case would support pts_givecar adder as an example.
        fields = {
            {variable = "plate", label = "Plate Text", placeholder = "PICKLE"},
        },
        purchaseCheckClient = function(fields)
            local vehicle = GetVehiclePedIsIn(PlayerPedId(), false)
            if not vehicle or not IsEntityAVehicle(vehicle) then return false, "You are not in a vehicle." end
            local plate = GetVehicleNumberPlateText(vehicle)
            plate = plate:match("^%s*(.-)%s*$")
            if plate == nil or plate == "" then return false, "This vehicle does not have a plate." end 
            if not vehicle or not IsEntityAVehicle(vehicle) then return false, "You are not in a vehicle." end
            if not fields.plate or fields.plate == "" or string.len(fields.plate) > 8 then return false, "Invalid plate text, make sure it's under 8 characters." end
            if fields.plate == plate then return false, "This plate is already on your vehicle." end
            return true, "success", {currentPlate = plate}
        end,
        purchaseCheckServer = function(fields)
            if not fields.plate or fields.plate == "" or string.len(fields.plate) > 8 then return false, "Invalid plate text, make sure it's under 8 characters." end
            if not fields.source then return false, "Invalid fields for pts_plate." end
            local result = GetOwnedVehicleFromPlate(fields.plate)
            if result then return false, "This plate is already in use." end
            local result = GetOwnedVehicleFromPlate(fields.currentPlate)
            if not result or result.owner ~= GetIdentifier(tonumber(fields.source)) then return false, "This vehicle is not yours." end
            return true
        end,
        onPurchaseServer = function(fields)
            local source = fields.source
            local plate = fields.plate
            UpdateVehiclePlate(tonumber(source), fields.currentPlate, plate)
            ShowNotification(tonumber(source), "You have updated your vehicle's plate to " .. plate .. "!")
        end,
        onPurchaseClient = function(fields)
            local source = fields.source
            local plate = fields.plate
            SetVehicleNumberPlateText(GetVehiclePedIsIn(PlayerPedId(), false), plate)
        end,
    },
    ["pts_givecar_plate"] = {
        label = "Give Car", -- This will display on top of the purchase button if fields are required.
        commandParameters = "{model}", -- This is the format of the command parameters that added to a coin product. {model} in this case would support pts_givecar adder as an example.
        fields = {
            {variable = "plate", label = "Plate Text", placeholder = "PICKLE"},
        },
        purchaseCheckClient = function(fields)
            if not fields.plate or fields.plate == "" or string.len(fields.plate) > 8 then return false, "Invalid plate text, make sure it's under 8 characters." end
            return true
        end,
        purchaseCheckServer = function(fields)
            if not fields.plate or fields.plate == "" or string.len(fields.plate) > 8 then return false, "Invalid plate text, make sure it's under 8 characters." end
            if not fields.source or not fields.model then return false, "Invalid fields for pts_givecar_plate." end
            local result = GetOwnedVehicleFromPlate(fields.plate)
            if result then return false, "This plate is already in use." end
            return true
        end,
        onPurchaseServer = function(fields)
            local source = fields.source
            local plate = fields.plate
            local model = fields.model
            ShowNotification(tonumber(source), "You have received a vehicle in your garage with the plate " .. plate .. "!")
            AddOwnedVehicle(tonumber(source), plate, model)
        end,
    },
    ["pts_givecar"] = {
        label = "Give Car", -- This will display on top of the purchase button if fields are required.
        commandParameters = "{model}", -- This is the format of the command parameters that added to a coin product. {model} in this case would support pts_givecar adder as an example.
        purchaseCheckClient = function(fields)
            return true
        end,
        purchaseCheckServer = function(fields)
            if not fields.source or not fields.model then return false, "Invalid fields for pts_givecar." end
            local result = GetOwnedVehicleFromPlate(fields.plate)
            if result then return false, "This plate is already in use." end
            return true
        end,
        onPurchaseServer = function(fields)
            local source = fields.source
            local plate = ""
            local letters = {"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"}
            local numbers = {"0", "1", "2", "3", "4", "5", "6", "7", "8", "9"}
            for i = 1, 3 do
                plate = plate .. letters[math.random(1, #letters)]
            end
            plate = plate .. " "
            for i = 1, 3 do
                plate = plate .. numbers[math.random(1, #numbers)]
            end
            local model = fields.model
            ShowNotification(tonumber(source), "You have received a vehicle in your garage with the plate " .. plate .. "!")
            AddOwnedVehicle(tonumber(source), plate, model)
        end,
        tebexCommand = function(args, raw)
            local transactionId = args[1]
            local fivemId = args[2]
            if tonumber(args[1]) then 
                local command = GetCustomCommand("pts_givecar", {}, {
                    productId = "tebex-transaction",
                    source = tonumber(args[1]),
                    model = args[2],
                })
                if command and command.onPurchaseServer then
                    command.onPurchaseServer(true)
                end
            else
                if not transactionId or tonumber(transactionId) then return end
                -- Give to player offline.
                local transactionId = args[1]
                local usernameId = tonumber(args[2]) or nil
                local model = args[3]
                if not transactionId or not model then print("Invalid args for pts_givecar (tebex):", transactionId, credit) return end
                local redeemCommand = "pts_givecar {pts_server_id} " .. model
                ProcessTebexCommand(transactionId, usernameId, redeemCommand)
            end
        end
    },
    ["pts_giveitem"] = {
        label = "Give Item", -- This will display on top of the purchase button if fields are required.
        commandParameters = "{name} {count}", -- These are the parameters' variable names in-order of being typed in the command box for the product. (e.g. pts_givecar adder red would need this set to "{model} {red}").
        purchaseCheckServer = function(fields)
            if not fields.source or not tonumber(fields.source) then return false, "Invalid source." end
            if not fields.name or fields.name == "" then return false, "Invalid item name." end
            if not fields.count or fields.count == "" or not tonumber(fields.count) then return false, "Invalid item count." end
            return Inventory.CanCarryItem(tonumber(fields.source), fields.name, tonumber(fields.count)), "You do not have enough inventory space to purchase this item."
        end,
        onPurchaseServer = function(fields)
            ShowNotification(tonumber(fields.source), "You have received x" .. fields.count .. " " .. GetItemLabel(fields.name) .. "!")
            Inventory.AddItem(tonumber(fields.source), fields.name, tonumber(fields.count))
        end,
        tebexCommand = function(args, raw)
            local transactionId = args[1]
            local fivemId = args[2]
            if tonumber(args[1]) then 
                local command = GetCustomCommand("pts_giveitem", {}, {
                    productId = "tebex-transaction",
                    source = tonumber(args[1]),
                    name = args[2],
                    count = tonumber(args[3]),
                })
                if command and command.onPurchaseServer then
                    command.onPurchaseServer(true)
                end
            else
                if not transactionId or tonumber(transactionId) then return end
                -- Give to player offline.
                local transactionId = args[1]
                local usernameId = tonumber(args[2]) or nil
                local name = args[3]
                local amount = tonumber(args[4])
                if not transactionId or not name or not amount then print("Invalid args for pts_giveitem (tebex):", transactionId, credit) return end
                local redeemCommand = "pts_giveitem {pts_server_id} " .. name .. " " .. amount
                ProcessTebexCommand(transactionId, usernameId, redeemCommand)
            end
        end
    },
    ["pts_givecoins"] = {
        label = "Add Coins", -- This will display on top of the purchase button if fields are required.
        commandParameters = "{count}", -- These are the parameters' variable names in-order of being typed in the command box for the product. (e.g. pts_givecar adder red would need this set to "{model} {red}").
        onPurchaseServer = function(fields)
            ShowNotification(tonumber(fields.source), "You have received " .. fields.count .. " " .. Config.CoinCurrency.plural .. "!")
            AddCoins(tonumber(fields.source), tonumber(fields.count))
        end,
        -- tebexCommand is needed to purchase coins.
        tebexCommand = function(args, raw)
            local transactionId = args[1]
            local fivemId = args[2]
            if tonumber(args[1]) then 
                -- Give to player directly.
                local target = tonumber(args[1])
                local credit = tonumber(args[2])
                if not target or not credit then print("Invalid args for pts_givecoins (game):", target, credit) return end
                AddCoins(target, credit)
                ShowNotification(target, "You have received " .. credit .. " " .. Config.CoinCurrency.plural .. "!")
            else
                if not transactionId or tonumber(transactionId) then return end
                -- Give to player offline.
                local transactionId = args[1]
                local usernameId = tonumber(args[2]) or nil
                local credit = tonumber(args[3])
                if not transactionId or not credit then print("Invalid args for pts_givecoins (tebex):", transactionId, credit) return end
                local redeemCommand = "pts_givecoins {pts_server_id} " .. credit
                ProcessTebexCommand(transactionId, usernameId, redeemCommand)
            end
        end
    },
    ["pts_setjob"] = {
        label = "Set Job", -- This will display on top of the purchase button if fields are required.
        commandParameters = "{name} {rank}", -- These are the parameters' variable names in-order of being typed in the command box for the product. (e.g. pts_givecar adder red would need this set to "{model} {red}").
        purchaseCheckServer = function(fields)
            if not fields.source or not tonumber(fields.source) then return false, "Invalid source." end
            if not fields.name or fields.name == "" then return false, "Invalid job name." end
            return true
        end,
        onPurchaseServer = function(fields)
            local source = tonumber(fields.source)
            local jobname = fields.name
            local jobrank = tonumber(fields.rank) or 0
            SetPlayerJob(source, jobname, jobrank)
            local job = GetPlayerJob(source)
            ShowNotification(tonumber(fields.source), "You have been set to " .. job.label .. " " .. job.rank_label .. "!")
        end,
        tebexCommand = function(args, raw)
            local transactionId = args[1]
            local fivemId = args[2]
            if tonumber(args[1]) then 
                local command = GetCustomCommand("pts_setjob", {}, {
                    productId = "tebex-transaction",
                    source = tonumber(args[1]),
                    name = args[2],
                    rank = args[3] or 0,
                })
                if command and command.onPurchaseServer then
                    command.onPurchaseServer(true)
                end
            else
                if not transactionId or tonumber(transactionId) then return end
                -- Give to player offline.
                local transactionId = args[1]
                local usernameId = tonumber(args[2]) or nil
                local jobname = args[3]
                local rank = tonumber(args[4]) or 0
                if not transactionId or not jobname then print("Invalid args for pts_setjob (tebex):", transactionId, credit) return end
                local redeemCommand = "pts_setjob {pts_server_id} " .. jobname .. " " .. rank
                ProcessTebexCommand(transactionId, usernameId, redeemCommand)
            end
        end
    },
}
