ProductInfo = {}

function split(inputstr, sep)
    if sep == nil then
        sep = "%s"
    end
    local t = {}
    for str in string.gmatch(inputstr, "([^"..sep.."]+)") do
        table.insert(t, str)
    end
    return t
end

function GetProductInfoArray()
    local arr = {}
    for k, v in pairs(ProductInfo) do
        v.id = k
        table.insert(arr, v)
    end
    return arr
end

function GetCommandFromString(str)
    local arr = split(str, " ")
    if #arr < 1 then return nil end
    local args = {}
    for i=2, #arr do
        table.insert(args, arr[i])
    end
    return arr[1], args
end

function GetCustomCommand(command, rawFields, extraFields, isParsed)
    local extraFields = extraFields or {}
    local commandPrefix, args = GetCommandFromString(command)
    if not commandPrefix then return end
    local customCommandCfg = Config.CustomCommands[commandPrefix]
    if not customCommandCfg then return end
    local fieldsCfg = customCommandCfg.fields or {}
    local fields = (isParsed and rawFields or {})
    if not isParsed then
        for i=1, #fieldsCfg do
            local field = fieldsCfg[i]
            local value = rawFields[i]
            if value then 
                fields[field.variable] = value
            end
        end
    end
    local commandFormat = split(customCommandCfg.commandParameters or "", " ")
    for i=1, #args do
        if commandFormat[i] then
            local currentVariable = commandFormat[i]:match("{(.-)}")
            if currentVariable then 
                fields[currentVariable] = args[i]
            end
        end
    end
    for k,v in pairs(extraFields) do
        fields[k] = v
    end
    return {
        name = commandPrefix,
        fields = fields,
        purchaseCheckClient = function()
            if customCommandCfg.purchaseCheckClient then
                return customCommandCfg.purchaseCheckClient(fields)
            end
            return true
        end,
        purchaseCheckServer = function()
            if customCommandCfg.purchaseCheckServer then
                return customCommandCfg.purchaseCheckServer(fields)
            end
            return true
        end,
        onPurchaseClient = function()
            if customCommandCfg.onPurchaseClient then
                customCommandCfg.onPurchaseClient(fields)
            end
        end,
        onPurchaseServer = function()
            if customCommandCfg.onPurchaseServer then
                customCommandCfg.onPurchaseServer(fields)
            end
        end,
    }
end
