const DEBUG_MODE = false;

function RunDebugEvents() {
    window.postMessage({
        type: "setConfig",
        config: {
            theme: "midnight",
            tebexApiKey: "EXAMPLE_API_KEY",
            image: "nui/src/assets/logo.png",
            customPages: [],
            coins: 25,
            spins: 1,
            nextSpinTime: 0,
            coinCurrency: {
                plural: "Coins",
                singular: "Coin",
                image: "https://dunb17ur4ymx4.cloudfront.net/packages/images/1fa9ed7ca58b4800414b49a2cd5e8de6793ae852.png",
                packages: [
                    6588035,
                    6588064,
                    6588069,
                ]
            },
            permissions: {
                manageProducts: true
            },
            productInfo: [
                {
                    id: "coin_1",
                    title: "Adder Super 200XR",
                    description: "Get the Adder Super 200XR added to your garage.",
                    image: "https://docs.fivem.net/vehicles/adder.webp",
                    coins: 50000,
                    category: "Vehicles",
                    globalLimit: 50,
                    userLimit: 25,
                    commands: [
                        "pts_givecar {pts_server_id} addersuper200xr",
                        "pts_givecar {pts_server_id} boomcruiser",
                    ]
                }
            ],
            customCommands: {
                ["pts_givecar"]: {
                    label: "Give Car",
                    fields: [
                        {variable: "plate", label: "Plate Text", placeholder: "Enter Plate Text"},
                    ]
                }
            }
        }
    }, '*');
    setTimeout(() => {
        window.postMessage({
            type: "setVisible",
            visible: true
        }, '*');
    }, 100);
}

document.addEventListener('DOMContentLoaded', (event) => {
    fetch('https://pickle_store/pageLoaded', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    })
    if (DEBUG_MODE) {
        setTimeout(() => {
            RunDebugEvents();
        }, 1000);
    }   
}, { once: true });