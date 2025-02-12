const DEBUG_MODE = false;

function CreateDebugProducts(amount) {
    let products = [];
    for (let i = 0; i < amount; i++) {
        products.push({
            id: "coin_" + i,
            name: "Product " + i,
            description: "Description " + i,
            coins: 100,
            image: "https://dunb17ur4ymx4.cloudfront.net/packages/images/1fa9ed7ca58b4800414b49a2cd5e8de6793ae852.png",
            category: "Balls",
            enabled: true,
            stock: 10,
            globalLimit: 50,
            userLimit: 25,
            commands: [
                "pts_givecar {pts_server_id} addersuper200xr",
                "pts_givecar {pts_server_id} boomcruiser",
            ]
        });
    }
    return products;
}

function RunDebugEvents() {
    window.postMessage({
        type: "setConfig",
        config: {
            disableAllProducts: true,
            theme: "midnight",
            tebexApiKey: "m5vg-e7dd2f9f5cc5d7b06adc7d360d0312c5ce3560cc",
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
            productInfo: CreateDebugProducts(100),
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