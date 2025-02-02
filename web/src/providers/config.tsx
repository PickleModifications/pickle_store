import { CustomPage } from '@/App';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useNuiEvent } from './nui/useNui';
import { useTheme } from '@/components/theme-provider';

type Locale = {
    [key: string]: string;
}

type CoinCurrency = {
    singular: string;
    plural: string;
    image: string;
    packages: number[];
}

type ConfigProductInfo = {
    id: number;
    globalLimit?: number;
    userLimit?: number;
    coins: number;
    title: string;
    description: string;
    image: string;
    packageId: number;
    category: string;
    commands: string[];
}

type CustomFields = {
    label: string,
    description: string,
    placeholder?: string,
}

type WheelPrize = {
    id: number;
    image: string;
    text: string;
}

export type Config = {
    theme: string;
    tebexApiKey: string;
    tebexStoreUrl: string;
    tebexBuyUrl: string | undefined | null;
    productInfo: ConfigProductInfo[] | undefined | null;
    basketIdentifier: string | undefined | null;
    discord_id: number | string | undefined | null;
    username_id: number | string | undefined | null;
    username: string;
    customPages: CustomPage[];
    image: string;
    spins: number | undefined | null;
    nextSpinTime: number | undefined | null;
    coins: number | undefined | null;
    coinCurrency: CoinCurrency | undefined | null;
    hiddenProducts: string[];
    wheelPrizes: WheelPrize[];
    permissions: {
        manageProducts: boolean;
    },
    customCommands: {
        [key: string]: {
            label: string;
            fields: CustomFields[];
        };
    }
}

interface ConfigContextProps {
    config: Config;
    setConfig: (newConfig: Config) => void;
}

const ConfigContext = createContext<ConfigContextProps | undefined>(undefined);

interface ConfigProviderProps {
    children: ReactNode;
}

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children }) => {
    const {theme, setTheme} = useTheme();
    const [config, setConfig] = useState<Config>({
        theme: "dark",
        tebexBuyUrl: undefined,
        productInfo: [],
        tebexStoreUrl: "https://tebex.io/",
        basketIdentifier: undefined,
        tebexApiKey: "UNDEFINED",
        username_id: -1, 
        discord_id: -1, 
        username: "UNKNOWN_USER",
        hiddenProducts: [],
        customPages: [],
        image: "",
        coins: 0,
        spins: 0,
        nextSpinTime: 0,
        coinCurrency: undefined,
        permissions: {
            manageProducts: false
        },
        wheelPrizes: [],
        customCommands: {}
    });
    useEffect(() => {
        setTheme(config.theme);
    }, [config.theme]);
    useNuiEvent("updateProductInfo", function(data) {
        setConfig((config) => {
            return {
                ...config,
                productInfo: data.productInfo,
            };
        });
    });
    useNuiEvent("setConfig", function(data) {
        console.log(data.config.spins)
        setConfig(data.config);
    });

    return (
        <ConfigContext.Provider value={{ config, setConfig }}>
            {children}
        </ConfigContext.Provider>
    );
};

export const useConfig = (): ConfigContextProps => {
    const context = useContext(ConfigContext);
    if (!context) {
        throw new Error('useConfig must be used within a ConfigProvider');
    }
    return context;
};