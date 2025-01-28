"use client";

import React, { createContext, useState, useContext, ReactNode } from 'react';

interface LoadingContextProps {
    isLoading: JSX.Element | null | undefined;
    setLoading: (loadingContent: JSX.Element) => void;
}

const LoadingContext = createContext<LoadingContextProps | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isLoading, setIsLoading] = useState<JSX.Element | null>(null);

    const setLoading = (loadingContent?: JSX.Element | null) => {
        setIsLoading(loadingContent || null);
    };

    return (
        <LoadingContext.Provider value={{ isLoading, setLoading }}>
            {children}
        </LoadingContext.Provider>
    );
};

export const useLoading = (): LoadingContextProps => {
    const context = useContext(LoadingContext);
    if (context === undefined) {
        throw new Error('useLoading must be used within a LoadingProvider');
    }
    return context;
};