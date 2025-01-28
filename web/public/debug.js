const DEBUG_MODE = false;

function RunDebugEvents() {
    window.postMessage({
        type: "setConfig",
        config: {
            tebexApiKey: "m5vg-e7dd2f9f5cc5d7b06adc7d360d0312c5ce3560cc",
            image: "nui/src/assets/logo.png",
            customPages: [],
            coins: 0,
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
                    id: 6398473,
                    category: "Character",
                    commands: [
                        "pts_addcharslot {pts_server_id} 1"
                    ]
                },
                {
                    id: "coin_1",
                    title: "Adder Super 200XR",
                    description: "Get the Adder Super 200XR added to your garage.",
                    image: "https://dunb17ur4ymx4.cloudfront.net/packages/images/1fa9ed7ca58b4800414b49a2cd5e8de6793ae852.png",
                    coins: 50000,
                    category: "Vehicles",
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
    fetch('https://pickle_tebexstore/requestConfig', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    }).then((response) => {
        response.json().then((data) => {
            console.log('Sending config data to NUI', data);
            window.postMessage(data, '*');
        });
    });
    if (!DEBUG_MODE) return;
    setTimeout(() => {
        RunDebugEvents();
    }, 100);
});