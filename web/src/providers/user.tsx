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
  spins: number;
  nextSpinTime: number;
  products: Product[];
}

export type BasketUser = {
  ident: string;
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
    const [coins, setCoins] = useState(0);
    const [basket, setBasket] = useState<BasketUser | null>(null);
    useEffect(() => {
      if (user) {
        setUser({...user, coins: coins});
      }
    }, [coins]);
    useNuiEvent('updatePlayerCoins', (data) => {
      setCoins(data.coins);
    });
    useEffect(() => { 
      setConfigState(config) 
      if (basket == null && config.tebexApiKey !== "UNDEFINED") {
        const fetchData = async () => {
          const cart = await ensureCart(config.tebexApiKey);
          setBasket(cart)
          if (cart) {
            setUser({
              ident: cart.ident,
              products: cart.products || await getProducts(cart.ident, config.tebexApiKey),
              username: user?.username || '',
              username_id: user?.username_id || 0,
              discord: user?.discord || { id: '', username: '' },
              coins: user?.coins || (config.coins || 0),
              spins: user?.spins || (config.spins || 0),
              nextSpinTime: user?.nextSpinTime || (config.nextSpinTime || 0),
            })
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