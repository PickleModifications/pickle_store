Config = {}

Config.Language = "en"

Config.Theme = "dark" -- "dark", "light", "pickle", "midnight", "red"

Config.TebexStoreUrl = "https://doubleback-rp.tebex.io/" -- Your Tebex store URL. This is required for the store to function if they are not logged in.

Config.TebexApiKey = "qtt5-df22b144597b28245dc950be6324f09c83e6db02" -- Your Tebex API key (NOT YOUR SECRET KEY, that's set on sv_tebexSecret in the server CFG). This is required for the store to function.

Config.IdentifierPrefix = "license" -- Don't change this unless you are alright with all existing coin accounts being reset.

Config.RequireDiscordIdentifier = true -- If true, the webstore will be non-interactable unless the user has a discord identifier. They will be instructed on this and how to fix it.

Config.RequireFiveMIdentifier = true -- If true, the webstore will be non-interactable unless the user has a FiveM identifier. They will be instructed on this and how to fix it.

Config.HeadlessTebexStore = false -- This should only be true if your tebex template is forcibly redirected to an external website (headless). This will return any checkout basket URL to the store URL.

Config.HiddenPackages = {}

Config.CoinCurrency = {
    singular = "Coin",
    plural = "Coins",
    image = "https://dunb17ur4ymx4.cloudfront.net/packages/images/1fa9ed7ca58b4800414b49a2cd5e8de6793ae852.png",
    packages = {
        6661597,
        6661598,
        6661600,
        6661602,
        6661604
    }
}

Config.CustomPages = {
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

Config.Advertisements = {
    {
        cron = "*/5 * * * *",
        message = "Need more coins? Visit the shop by doing /shop in the chat."
    },
}

Config.CustomCommands = {
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
            if not fields.source or not fields.model then return false, "Invalid fields for pts_givecar." end
            local result = GetOwnedVehicleFromPlate(fields.plate)
            if result then return false, "This plate is already in use." end
            return true
        end,
        onPurchaseServer = function(fields)
            local source = fields.source
            local plate = fields.plate
            local model = fields.model
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
            local letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
            local numbers = "0123456789"
            for i = 1, 3 do
                plate = plate .. letters:sub(math.random(1, #letters), math.random(1, #letters))
            end
            plate = plate .. " "
            for i = 1, 3 do
                plate = plate .. numbers:sub(math.random(1, #numbers), math.random(1, #numbers))
            end
            local model = fields.model
            AddOwnedVehicle(tonumber(source), plate, model)
        end,
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
            Inventory.AddItem(tonumber(fields.source), fields.name, tonumber(fields.count))
        end,
    },
}