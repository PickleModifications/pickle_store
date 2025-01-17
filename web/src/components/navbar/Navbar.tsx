"use client"

/**
 * v0 by Vercel.
 * @see https://v0.dev/t/lJwnQlHSEBA
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import Cart from "../cart/Cart"
import React, { useEffect, useState } from "react"
import { BASKET_COOKIE_ID, useUser } from "@/providers/user"
import { DropdownMenu, DropdownMenuContent,DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DoorOpen } from "lucide-react"
import { TEBEX_API_PUBLIC } from "@/utils"
import Image from "@/components/image"
import { useConfig } from "@/providers/config"

const ACCOUNT_ICONS = {
  fivem: ({style} : {style?: React.CSSProperties}) => (
    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="15" height="15" viewBox="0 0 48 48" style={{...style}}>
      <polygon fill="#ff6f00" points="5,45 9,34 21,22 15,45"></polygon><polygon fill="#ff6f00" points="25,18 33,45 43,45 32,12"></polygon><polygon fill="#ff6f00" points="16.059,14.164 20,3 28,3"></polygon><polygon fill="#ff6f00" points="10.731,29.002 23,17 23,15 11.58,26.667"></polygon><polygon fill="#ff6f00" points="15.142,16.429 13,22 29.724,5.725 28.818,3.178"></polygon><polygon fill="#ff6f00" points="23.932,14.055 24.377,15.626 30.941,9.178 30.385,7.702"></polygon>
    </svg>
  ),
  discord: ({style} : {style?: React.CSSProperties}) => (
    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="15" height="15" viewBox="0 0 48 48" style={{...style}}>
      <path fill="#8c9eff" d="M42,45l-9-7.001L34,41H10c-2.761,0-5-2.238-5-5V10c0-2.762,2.239-5,5-5h27c2.762,0,5,2.238,5,5V45z"></path><path fill="#fff" d="M32.59,16.24c0,0-2.6-2.01-5.68-2.24l-0.27,0.55c2.78,0.67,4.05,1.64,5.38,2.83 C29.73,16.21,27.46,15,23.5,15s-6.23,1.21-8.52,2.38c1.33-1.19,2.85-2.27,5.38-2.83L20.09,14c-3.23,0.31-5.68,2.24-5.68,2.24 S11.5,20.43,11,28.62c2.94,3.36,7.39,3.38,7.39,3.38l0.92-1.23c-1.57-0.54-3.36-1.51-4.9-3.27c1.84,1.38,4.61,2.5,9.09,2.5 s7.25-1.12,9.09-2.5c-1.54,1.76-3.33,2.73-4.9,3.27L28.61,32c0,0,4.45-0.02,7.39-3.38C35.5,20.43,32.59,16.24,32.59,16.24z M20,27 c-1.1,0-2-1.12-2-2.5s0.9-2.5,2-2.5s2,1.12,2,2.5S21.1,27,20,27z M27,27c-1.1,0-2-1.12-2-2.5s0.9-2.5,2-2.5s2,1.12,2,2.5 S28.1,27,27,27z"></path>
    </svg>
  )
}

export type AccountType = {
  type: "fivem" | "discord",
  username: string | undefined | null,
  ident?: string,
  packageId?: number,
  addPackageCart?: number,
  requireJoinDiscord?: boolean,
}

export function Account({account, style} : {account: AccountType, style?: React.CSSProperties}) {
  const IconComponent = ACCOUNT_ICONS[account.type];
  const icon = <IconComponent style={{}} />;
  const [loading, setLoading] = useState(false);
  return (account.username ? (
    <DropdownMenu>
      <DropdownMenuTrigger className="select-none cursor-pointer flex gap-1 items-center hover:bg-zinc-800 bg-zinc-900 h-auto p-2 rounded-lg transition-colors" style={style}>
        {!loading ? (
          <>
            {icon}
            <div className="font-semibold text-sm">{account.username}</div>
          </>
        ) : (
          <div className="flex gap-1 items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div className="text-sm font-semibold">Logging {account.username ? "out" : "in"}...</div>
          </div>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel onClick={() => {
          setLoading(true);
        }} className="cursor-pointer flex gap-2 items-center text-red-500 hover:text-red-600">
          <DoorOpen className="h-4 w-4" />
          <div>Log Out</div>
        </DropdownMenuLabel>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <div className="select-none cursor-pointer flex gap-1 items-center hover:bg-zinc-800 bg-zinc-900 h-auto p-2 rounded-lg transition-colors" style={style} onClick={() => {
      setLoading(true);
    }}>
      {!loading ? (
        <>
        {icon}
        <div className="font-semibold text-sm">Login{account.requireJoinDiscord && " & Join Discord"}</div>
        </>
      ) : (
        <div className="flex gap-1 items-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div className="text-sm font-semibold">Logging {account.username ? "out" : "in"}...</div>
        </div>
      )}
    </div>
  ))
}

export default function Navbar({pages, onPageSelect} : {pages: {label: string, content: JSX.Element}[], onPageSelect: (id: number) => void}) {
  const {user} = useUser()
  const config = useConfig()
  const [userState, setUserState] = useState(user)
  const [configState, setConfigState] = useState(config)
  useEffect(() => { setUserState(user) }, [user])
  useEffect(() => { setConfigState(config) }, [config])
  return (
    <header className="border-grid flex justify-center sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex p-2 gap-4 items-center justify-between w-full">
            <div className="flex gap-2 items-center">
              <img className="rounded-md" src={configState.image} alt="" style={{height: 35}} />
              <nav className="hidden lg:flex gap-2">
                  {pages.map((link, linkId) => (
                      <div
                        key={linkId}
                        onClick={() => onPageSelect(linkId)}
                        className="cursor-pointer group inline-flex h-9 w-max items-center justify-center hover:bg-white/10  hover:shadow-lg rounded-md px-3 py-1 text-sm font-semibold transition ease-in-out duration-200"
                      >
                        {link.label}
                      </div>
                  ))}
              </nav>
            </div>
            <div className="flex gap-2">
                {userState && (
                <div className="hidden lg:flex">
                  <Account account={{type: "fivem", ident: userState.ident, username: userState.username}}/>
                </div>
                )}
                {(userState && !userState.username) && (
                <div className="flex lg:hidden">
                  <Account account={{type: "fivem", ident: userState.ident, username: userState.username}}/>
                </div>
                )}
                {(userState) && (
                <div className="hidden lg:flex">
                  <Account account={{type: "discord", requireJoinDiscord: true, ident: userState.ident, username: userState.discord?.username}}/>
                </div>
                )}
              <Cart />
              <Sheet>
                  <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="lg:hidden">
                      <MenuIcon className="h-6 w-6" />
                      <span className="sr-only">Toggle navigation menu</span>
                  </Button>
                  </SheetTrigger>
                  <SheetContent side="right">
                  <Image src={configState.image} alt="" height={50} width={"auto"} />
                  <div className="grid gap-2 py-4">
                      {pages.map((link, linkId) => (
                          <div
                            key={linkId}
                            onClick={() => onPageSelect(linkId)}
                            className="cursor-pointer group inline-flex h-9 w-max items-center justify-center hover:bg-white/10  hover:shadow-lg rounded-md px-3 py-1 text-sm font-semibold transition ease-in-out duration-200"
                          >
                            {link.label}
                          </div>
                      ))}
                      {userState && (
                      <>
                      <Account account={{type: "fivem", ident: userState.ident, username: userState.username}}/>
                      <Account account={{type: "discord", requireJoinDiscord: true, ident: userState.ident, username: userState.discord?.username}}/>
                      </>
                      )}
                      </div>
                  </SheetContent>
              </Sheet>
            </div>
        </div>
      </header>
    );
  }
function MenuIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  )
}