"use client";

import { ensureCart, getBaseURL } from '@/utils';
import { User } from '@/components/cart/Cart';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useLoading } from './loading';
import { useToast } from '@/hooks/use-toast';

export const BASKET_COOKIE_ID = "tbex-basketIdentifier";

interface UserContextProps {
    user: User | null;
    setUser: (user: User | null) => void;
}
 
const UserContext = createContext<UserContextProps | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const { setLoading } = useLoading();
    useEffect(() => {
        const fetchData = async () => {
          const basketIdentifier = localStorage.getItem(BASKET_COOKIE_ID) || undefined;
          let updatedUser: User | null = null;
          const data = await ensureCart(basketIdentifier);
          if (data) {
            console.log("Fetched / Created basket:", data);
            updatedUser = data;
            localStorage.setItem(BASKET_COOKIE_ID, data.ident);
          }
          if (updatedUser) {
            setUser(updatedUser);
          }
          setLoading(false);
        };
        fetchData();
      }, []);
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