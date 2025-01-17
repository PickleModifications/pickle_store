"use client";

import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button";
import { ShoppingCart, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { getPriceString, performCartAction } from "@/utils";
import { Account } from "../navbar/Navbar";
import { useUser } from "@/providers/user";
import Image from "@/components/image"
import Tebex from "@tebexio/tebex.js";

export type BasketPackage = {
    id: number,
    type: string,
    name: string,
    purchaseType: string,
    image: string,
    description: string,
    currency: string,
    in_basket: {
        gift_username: string | null,
        gift_username_id: number | null,
        price: number,
        quantity: number,
    }
}

export type User = {
    base_price: number,
    cancel_url: string,
    complete: boolean,
    complete_auto_redirect: boolean,
    complete_url: string,
    currency: string,
    coupons: string[],
    creator_code: string | null,
    email: string,
    giftcards: string[],
    id: number,
    ident: string,
    ip: string,
    links: {
        checkout: string,
        payment: string,
    },
    packages: BasketPackage[],
    sales_tax: number,
    total_price: number,
    username: string,
    username_id: number,
    discord?: Discord,
}

export type Discord = {
    id: string,
    username: string,
}

export default function Cart() {
    const {user, setUser} = useUser();
    const [userState, setUserState] = useState<User | null>(user);
    useEffect(() => {
        setUserState(user);
        if (user && user.ident) {
            Tebex.checkout.init({
                ident: user.ident,
                locale: (navigator.language || "en-US"),
                theme: "dark"
            });
        }
    }, [user]);
    return userState && (
        <>
        {(userState.username) ? (
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline">
                        <ShoppingCart className="h-6 w-6" />
                        {userState.packages.length > 0 && (<span>{userState.packages.length}</span>)}
                        <span className="sr-only">Cart ({userState.packages.length})</span>
                    </Button>
                </SheetTrigger>
                <SheetContent className="select-none" side="right">
                    <div className="pt-6 flex items-center justify-between">
                        <h1 className="text-2xl font-semibold">Cart </h1>
                        <div className="text-sm text-zinc-600">{userState.packages.length} item(s)</div>
                    </div>
                    {userState.packages.length == 0 && (
                        <div className="p-6 text-center text-zinc-600">No items in cart.</div>
                    ) || (
                        <>
                        <div className="grid gap-2 pt-6 pb-2">
                            {userState.packages.map((product) => (
                                <div key={product.id} className="p-2 rounded-lg bg-zinc-900 flex gap-2 items-center">
                                    <Image src={product.image} alt={product.name} width={50} height={50} />
                                    <div className="flex flex-col w-full">
                                        <div className="flex items-center gap-1">
                                        <span>{product.name}</span>
                                        {/* <span className="text-sm text-zinc-400">(x{product.in_basket.quantity})</span> */}
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <span className="text-sm text-zinc-400">{getPriceString(product.in_basket.price, product.type, userState.currency)}</span>
                                            <div style={{padding: "1px 10px"}} className="bg-zinc-950 text-sm rounded-md">{product.purchaseType}</div>
                                        </div>
                                    </div>
                                    <XCircle className="cursor-pointer" size={"24"} onClick={() => {
                                        const newPackages = userState.packages.filter(pkg => pkg.id !== product.id);
                                        performCartAction(userState.ident, undefined, product.id);
                                        setUser({...userState, packages: newPackages});
                                    }}></XCircle>
                                </div>
                            ))}
                        </div>
                        </>
                    )}
                    <div className="flex flex-col gap-2">
                        {userState.packages.length > 0 && (
                            <Button onClick={() => {
                                Tebex.checkout.launch();
                            }} className="w-full" variant="secondary"><ShoppingCart/> Checkout</Button>
                        )}
                        <Account style={{width: "100%"}} account={{type: "fivem", ident: userState.ident, username: userState.username}}/>
                        <Account style={{width: "100%"}} account={{type: "discord", requireJoinDiscord: true, ident: userState.ident, username: userState.discord?.username}}/>
                    </div>
                </SheetContent>
            </Sheet>
        ) : (null)}
        </>
    )
}