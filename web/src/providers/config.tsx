import { CustomPage } from '@/App';
import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Config = {
    discord_id: number | string | undefined | null;
    username_id: number | string | undefined | null;
    username: string;
    customPages: CustomPage[];
    image: string;
}

interface ConfigProviderProps {
    children: ReactNode;
}

const ConfigContext = createContext<Config | undefined>(undefined);

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children }) => {
    const [config, setConfig] = useState<Config>({ 
        username_id: 0, 
        discord_id: 988962709691314276, 
        username: "PickleMods",
        customPages: [
            {
                label: "Terms of Service",
                content: `
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
                            <li>Products purchased are as-is, and the asset&apos;s creator(s) hold no liability for damages, maintainence, or providance of products or services is waived.</li>
                            <li>There are no refunds for any reason, however the asset&apos;s creator may waive this and process a refund at-will of the creator(s).</li>
                        </ol>
                    </div>   
                `
            }
        ],
        image: "/src/assets/logo.png"
     });

    return (
        <ConfigContext.Provider value={config}>
            {children}
        </ConfigContext.Provider>
    );
};

export const useConfig = (): Config => {
    const context = useContext(ConfigContext);
    if (context === undefined) {
        throw new Error('useConfig must be used within a ConfigProvider');
    }
    return context;
};