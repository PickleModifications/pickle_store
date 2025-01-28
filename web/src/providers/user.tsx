"use client";

import { ensureCart, getBaseURL, getProducts } from '@/utils';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useConfig } from './config';
import { fetchNui } from './nui/fetchNui';
import { Product } from '@/components/product/Product';
import { useNuiEvent } from './nui/useNui';

export type User = {
  ident: string;
  username: string;
  username_id: number;
  discord: {
      id: string;
      username: string;
  };
  coins: number;
  products: Product[];
}

interface UserContextProps {
    user: User | null;
    setUser: (user: User | null) => void;
}
 
const UserContext = createContext<UserContextProps | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const { toast } = useToast();
    const {config, setConfig} = useConfig();
    const [user, setUser] = useState<User | null>(null);    
    const [configState, setConfigState] = useState(config);
    useNuiEvent('updatePlayerCoins', (data) => {
      if (user) {
        setUser(
          {
            ...user,
            coins: data.coins || 0
          }
        );
      }
    });
    useEffect(() => { 
      setConfigState(config) 
      if (config.tebexApiKey !== "UNDEFINED") {
        const fetchData = async () => {
          const basketIdentifier = config.basketIdentifier;
          let updatedUser: User | null = null;
          const user = await ensureCart(basketIdentifier, config.tebexApiKey);
          if (user) {
            if (basketIdentifier !== user.ident) {
              fetchNui("updateBasketIdentifier", user.ident);
              config.basketIdentifier = user.ident;
              setConfig(config);
            }
            updatedUser = user;
            // localStorage.setItem(BASKET_COOKIE_ID, data.ident);
          }
          if (updatedUser) {
            updatedUser.products = await getProducts(updatedUser.ident, config.tebexApiKey);
            updatedUser.discord = { id: config.discord_id as string, username: config.username as string };
            updatedUser.username_id = config.username_id as number;
            updatedUser.username = config.username as string;
            updatedUser.coins = config.coins || 0;
            setUser(updatedUser);
          }
        };
        fetchData();
      }
    }, [config]);
    return (
        <UserContext.Provider value={{ user, setUser }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = (): UserContextProps => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};