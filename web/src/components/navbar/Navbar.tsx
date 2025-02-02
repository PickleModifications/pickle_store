"use client"

/**
 * v0 by Vercel.
 * @see https://v0.dev/t/lJwnQlHSEBA
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import React, { useEffect, useState } from "react"
import { useUser } from "@/providers/user"
import { DropdownMenu, DropdownMenuContent,DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DoorOpen } from "lucide-react"
import Image from "@/components/image"
import { useConfig } from "@/providers/config"
import { getApiUser, getPriceString } from "@/utils"
import { AddPackageToCart, ProductOption } from "../product/Product"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useLoading } from "@/providers/loading"
import { useNuiEvent } from "@/providers/nui/useNui"
import { fetchNui } from "@/providers/nui/fetchNui"
import Wheel from "../wheel/Wheel"


export type AccountType = {
  type: "fivem" | "discord",
  username: string | undefined | null,
  ident?: string,
  packageId?: number,
  addPackageCart?: number,
  requireJoinDiscord?: boolean,
}

export default function Navbar({pages, onPageSelect} : {pages: {label: string, content: JSX.Element}[], onPageSelect: (id: number) => void}) {
  const {user} = useUser()
  const {config} = useConfig()
  const [userState, setUserState] = useState(user)
  const [configState, setConfigState] = useState(config)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [tebexTransactionId, setTebexTransactionId] = useState<string>("")
  const {setLoading} = useLoading()
  const [showRedeem, setShowRedeem] = useState(false)
  useEffect(() => {
    setUserState(user) 
  }, [user])
  useEffect(() => { setConfigState(config) }, [config])
  useNuiEvent("openRedeemMenu", () => {
    setShowRedeem(true)
  })
  useNuiEvent("setRedeemStatus", (data) => {
    setStatusMessage(data.status.statusText)
  })
  return (
    <header style={{borderRadius: "5px 5px 0px 0px"}} className="border-grid flex justify-center sticky top-0 z-50 w-full border-b bg-background/95 supports-[backdrop-filter]:bg-background/60">
        <div className="flex p-2 gap-4 items-center justify-between w-full">
            <div className="flex gap-2 items-center">
              <img className="rounded-md" src={configState.image} alt="" style={{height: 35}} />
              <nav className="hidden lg:flex gap-2">
                  {pages.map((link, linkId) => (
                      <div
                        key={linkId}
                        onClick={() => onPageSelect(linkId)}
                        className="cursor-pointer group inline-flex h-9 w-max items-center justify-center hover:bg-foreground/10 rounded-md px-3 py-1 text-sm font-semibold transition ease-in-out duration-200"
                      >
                        {link.label}
                      </div>
                  ))}
              </nav>
            </div>
            <div className="flex gap-2">
              {(userState && configState.coinCurrency) && (
                <Dialog>
                  <DialogTrigger className="flex items-stretch">
                    <div className="flex gap-0 items-center cursor-pointer hover:scale-105 transition ease-in-out duration-200">
                      <div style={{borderRadius: "5px 0px 0px 5px"}} className="flex items-center gap-1 bg-secondary p-5 px-2 py-1 h-full">
                        <img className="h-5 w-5 rounded-md" src={configState.coinCurrency.image} alt=""/>
                        <div className="font-semibold">{userState.coins?.toLocaleString() || "0"}</div>
                      </div>
                      <div style={{borderRadius: "0px 5px 5px 0px"}} className="flex h-full px-1 gap-0 bg-green-600 justify-center items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent>
                  <DialogHeader>
                      <DialogTitle className="pr-10 pb-2">Purchase {configState.coinCurrency.plural}</DialogTitle>
                      <DialogDescription className="hidden"/>
                      <div className="flex flex-col gap-2">
                        {configState.coinCurrency.packages.map((packageId, index) => {
                            const product = userState.products.find(product => product.id === packageId)
                            return product ? (
                              <div key={index} className="flex gap-2 justify-between items-center p-2 border rounded-md">
                                <img className="h-10 w-10 rounded-md" src={configState.coinCurrency?.image} alt=""/>
                                <div className="w-full whitespace-nowrap">{product.name}</div>
                                {
                                  product.productOptions.map((option: ProductOption) => (
                                    <Button key={option.id} className="w-full" variant="secondary" onClick={() => {
                                      setLoading(
                                        <div className="flex flex-col items-center justify-center">
                                          <div className="flex items-center gap-2">
                                            <svg className="animate-spin h-5 w-5 " xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <div className="text-xl font-bold	">Opening Tebex Checkout...</div> 
                                          </div>
                                          <div className="text-md text-muted-foreground">Please wait 3-5 seconds for the checkout window to open.</div>
                                        </div>
                                      )
                                      AddPackageToCart(
                                        userState.ident, 
                                        configState.tebexApiKey, 
                                        userState.discord?.id, 
                                        option.id, 
                                        product.name + " (" + option.name + ")", 
                                        configState.tebexStoreUrl,
                                        function(message: string) {
                                          setLoading(null)
                                        }
                                      )
                                    }}>{
                                        <>
                                        {option.discount > 0 && (
                                            <span className="text-red-500 line-through">{getPriceString(option.base_price + option.discount, product.type, product.currency)}</span>
                                        )}
                                        <span className="font-semibold">{getPriceString(option.base_price, product.type, product.currency)}</span>
                                        </>
                                    }</Button>
                                  ))
                                }
                              </div>
                            ) : null
                          }
                        )}
                      </div>
                  </DialogHeader>
                  </DialogContent>
                </Dialog>

              )}
              <Wheel/>
              <Dialog open={showRedeem} onOpenChange={(open) => {
                setShowRedeem(open)
                if (!open) {
                  setStatusMessage(null);
                }
              }}>
                <DialogTrigger>
                  <Button variant="secondary">Redeem</Button>
                </DialogTrigger>
                <DialogContent>
                <DialogHeader>
                    <DialogTitle className="pr-10 pb-2">Redeem Transaction</DialogTitle>
                    <DialogDescription className="hidden"/>
                    <div className="flex flex-col min-w-64 gap-4 text-sm text-muted-foreground" style={{position: "relative"}}>
                      <input
                        type="text"
                        placeholder="Tebex Transaction ID (e.g. tbx-123-45-6789)"
                        className="w-full p-1 border rounded-md bg-foreground/10"
                        value={tebexTransactionId}
                        onChange={(e) => setTebexTransactionId(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            fetchNui("redeemTransaction", (e.target as HTMLInputElement).value).then((response: any) => {
                              setStatusMessage(response.statusText)
                            })
                          }
                        }}
                      />
                      <Button variant="secondary" onClick={() => {
                        fetchNui("redeemTransaction", tebexTransactionId).then((response: any) => {
                          setStatusMessage(response.statusText)
                        })
                      }}>Redeem</Button>
                      <div className="text-sm flex justify-center text-muted-foreground">
                        {statusMessage}
                      </div>
                    </div>
                </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
        </div>
      </header>
    );
}