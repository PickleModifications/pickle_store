import { CustomPage } from '@/App';
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useNuiEvent } from './nui/useNui';

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

export type Config = {
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
    coins: number | undefined | null;
    coinCurrency: CoinCurrency | undefined | null;
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
    const [config, setConfig] = useState<Config>({
        tebexBuyUrl: undefined,
        productInfo: [],
        tebexStoreUrl: "https://tebex.io/",
        basketIdentifier: undefined,
        tebexApiKey: "UNDEFINED",
        username_id: -1, 
        discord_id: -1, 
        username: "UNKNOWN_USER",
        customPages: [],
        image: "",
        coins: 0,
        coinCurrency: undefined,
        permissions: {
            manageProducts: false
        },
        customCommands: {}
    });
    useNuiEvent("updateProductInfo", function(data) {
        setConfig((config) => {
            return {
                ...config,
                productInfo: data.productInfo,
            };
        });
    });
    useNuiEvent("setConfig", function(data) {
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