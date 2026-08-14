function GetPlayerIdentifiersArray(source)
    local source = tonumber(source)
    if not source then return {} end
    local identifierTypes = {"steam", "discord", "xbl", "live", "license", "license2", "fivem", "ip"}
    local identifiers = {}
    for i=1, #identifierTypes do
        local identifier = GetPlayerIdentifierByType(source, identifierTypes[i])
        if identifier then
            table.insert(identifiers, identifier)
        end
    end
    return identifiers
end

function GetFilteredPlayerIdentifiers(source)
    local source = tonumber(source)
    if not source then return end
    local identifiers = GetPlayerIdentifiersArray(source)
    local filteredIdentifiers = {}
    for i=1, #identifiers do
        if string.match(identifiers[i], "ip:") and Config.DisableIPIdentifier then
            table.insert(filteredIdentifiers, identifiers[i])
        end
    end
    return filteredIdentifiers
end

function GetPlayerPrefixIdentifier(source)
    local source = tonumber(source)
    if not source then return end
    local prefix = Config.IdentifierPrefix
    local identifiers = GetPlayerIdentifiersArray(source)
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

-- Time-played rewards: grant configured commands for every interval of playtime a player accumulates this session.
local PlaytimeTracker = {}

function GrantPlaytimeReward(source)
    local rewards = Config.PlaytimeRewards
    if not rewards or not rewards.commands then return end
    for i=1, #rewards.commands do
        local entry = rewards.commands[i]
        if entry and #entry >= 1 then
            local command = GetCustomCommand(entry[1], entry[2] or {}, {source = source}, true)
            if command then
                if command.onPurchaseServer then
                    debugPrint("Custom command execution (playtime reward): " .. command.name)
                    command.onPurchaseServer()
                end
            else
                local commandString = GetCommandReplaced(source, entry[1], {})
                debugPrint("Executing non-config command (playtime reward): " .. commandString)
                ExecuteCommand(commandString)
            end
        end
    end
    if rewards.notify and rewards.notifyMessage then
        ShowNotification(source, rewards.notifyMessage)
    end
end

AddEventHandler("playerDropped", function()
    local source = source
    PlaytimeTracker[source] = nil
end)

CreateThread(function()
    while true do
        Wait(1000)
        local rewards = Config.PlaytimeRewards
        if rewards and rewards.enabled then
            local interval = tonumber(rewards.interval) or 3600
            if interval > 0 then
                local players = GetPlayers()
                for i=1, #players do
                    local source = tonumber(players[i])
                    if source then
                        PlaytimeTracker[source] = (PlaytimeTracker[source] or 0) + 1
                        if PlaytimeTracker[source] >= interval then
                            PlaytimeTracker[source] = PlaytimeTracker[source] - interval
                            GrantPlaytimeReward(source)
                        end
                    end
                end
            end
        end
    end
end)