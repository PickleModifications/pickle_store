'use client'

import { Button } from "@/components/ui/button";
import Image from "@/components/image"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { getPriceString, getProducts, performCartAction, TEBEX_API_PUBLIC } from "@/utils";
import { BasketPackage, User } from "../cart/Cart";
import { useUser } from "@/providers/user";
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

export type ProductOption = {
    id: number
    name: string
    discount: number
    base_price: number
}

export type Category = {
    id: number
    name: string
}

export type Product = {
    id?: number
    type: string
    category?: Category
    videoUrl?: string
    name: string
    base_price: number
    productOptions: ProductOption[]
    description: string
    image: string
    discount: number
    currency: string
    groups: string[]
}

export function IsProductInCart(product: Product, user: User) {
    if (!user || !user.packages || product.id === undefined) {
        return false;
    }
    return user.packages.some(pkg => pkg.id === product.id || product.productOptions.some(option => option.id === pkg.id));
}
  
export function AddPackageToCart(ident: string, discord: string | undefined, packageId: number, name: string, toast?: (props: {title: string, description: string, duration: number}) => void) {
    performCartAction(ident, packageId, undefined, discord);
    if (toast) {
        toast({
            title: "Added to cart",
            description: name + " has been added to the cart",
            duration: 3000,
        })
    }
}

export function ProductCard({ product }: { product: Product }) {
    const {user, setUser} = useUser();
    const {toast} = useToast();
    const [userState, setUserState] = useState<User | null>(null);
    const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    useEffect(() => { setUserState(user) }, [user]);
    useEffect(() => {
        if (thumbnailLoaded) { return }
        setThumbnailLoaded(true);
    }, []);
    return (
        <Dialog>
            <DialogTrigger>
                <div className="bg-zinc-900 rounded-md animate-appear relative select-none cursor-pointer filter brightness-80 hover:brightness-125 hover:scale-90 hover:z-1 z-0 scale-100 transition ease-in duration-200">
                    <AspectRatio ratio={16 / 9}>
                        <Image className="rounded-md max-h-full" src={product.image} alt="" width={"100%"} height={"100%"}/>
                        <div className="absolute bottom-0 left-0 m-2 pl-2 pr-2 bg-background rounded-xl bg-opacity-75">
                            <span className="text-sm font-semibold">{product.name}</span>
                        </div>
                    </AspectRatio>
                    {thumbnailLoaded && (<div style={{paddingBottom: 2}} className="absolute top-0 left-0 m-2 pl-2 pr-2 bg-background rounded-xl bg-opacity-5">
                        {product.discount > 0 && (
                            <span className="text-xs font-semibold text-red-500 line-through pr-1">${(product.base_price + product.discount).toFixed(2)}</span>
                        )}
                        <span className="text-sm font-semibold">{getPriceString(product.base_price, product.type, product.currency)}</span>
                    </div>)}
                </div>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
                <DialogTitle>{product.name}</DialogTitle>
                <DialogDescription className="hidden"/>
                <div className="text-sm text-muted-foreground" style={{position: "relative"}}>
                    <div className="flex flex-col gap-4 mt-4 relative">
                        <div className="flex flex-row gap-2">
                                {product.videoUrl && (
                                    <AspectRatio ratio={16 / 9}>
                                        <iframe width={"100%"} height={"100%"} src={product.videoUrl} frameBorder="0" allowFullScreen />
                                    </AspectRatio>
                                ) || (
                                    <img className="rounded-md max-h-48" src={product.image} alt=""/>
                                )}
                            <div className="max-h-48 overflow-y-auto" dangerouslySetInnerHTML={{__html: product.description}}>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            {!loading ? (product.productOptions.map((option: ProductOption) => (
                                (userState && userState.ident) && (
                                    (!IsProductInCart(product, userState)) && (
                                        <Button key={option.id} className="w-full" variant="secondary" onClick={() => {
                                            if (!userState.username) {
                                                setLoading(true);
                                            }
                                            else {
                                                setUser({
                                                    ...userState,
                                                    packages: [...userState.packages, {
                                                        id: option.id,
                                                        type: product.type,
                                                        name: product.name,
                                                        purchaseType: option.name,
                                                        image: product.image,
                                                        in_basket: {
                                                            gift_username: null,
                                                            gift_username_id: null,
                                                            price: option.base_price,
                                                            quantity: 1,
                                                        }
                                                    } as BasketPackage]
                                                })
                                                AddPackageToCart(userState.ident, userState.discord?.id, option.id, product.name + " (" + option.name + ")", toast);
                                            }
                                        }}>{option.name}: {
                                            <>
                                            {option.discount > 0 && (
                                                <span className="text-red-500 line-through">${(option.base_price + option.discount).toFixed(2)}</span>
                                            )}
                                            <span className="font-semibold">{getPriceString(option.base_price, product.type, product.currency)}</span>
                                            </>
                                        }</Button>
                                    ) || (
                                        <Button key={option.id} className="w-full" variant="secondary" disabled>Already in cart</Button>
                                    )
                                )
                            ))) : (
                            <Button key={"loading"} className="w-full flex gap-1 items-center" variant="secondary" disabled>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <div className="text-sm font-semibold">Logging in...</div>
                            </Button>
                        )}
                        </div>
                    </div>
                </div>
            </DialogHeader>
            </DialogContent>
      </Dialog>
    );
}

export function Products() {
    const [products, setProducts] = useState<Product[]>([]);
    const {toast} = useToast();
    const {user, setUser} = useUser();
    // const [userState, setUserState] = useState<User | null>(null);
    const [firstLoad, setFirstLoad] = useState(true);
    const hiddenCategories = [2512198, 2657798]
    const categories: { [key: string]: { label: string, products: Product[] } } = {
        "all": {label: "All Products", products: products.filter(product => !hiddenCategories.includes(product.category?.id || 0))},
        "general": {label: "General", products: products.filter(product => product.groups.includes("general"))},
        "mlo": {label: "Housing & Locations", products: products.filter(product => product.groups.includes("mlo"))},
        "unban": {label: "Unban Passes", products: products.filter(product => product.groups.includes("unban"))},
        "gems": {label: "Gems", products: products.filter(product => product.groups.includes("gems"))},
        "featured": {label: "Featured Products", products: products.filter(product => product.groups.includes("featured"))},
    }
    const categoriesOrder = ["all", "general", "mlo", "unban", "gems"];
    useEffect(() => {  
        async function fetchData() {
            if (!user || !user.ident) { return }
            const updatedProducts = await getProducts(user.ident);
            setProducts(updatedProducts);
        }
        fetchData();
        if (firstLoad && user && user.ident && user.username) {
            setFirstLoad(false);
            const searchParams = new URLSearchParams(window.location.search);
            const addPackageCart = searchParams.get('addPackageCart');
            searchParams.delete('success')
            if (addPackageCart) {
                searchParams.delete('addPackageCart');
                const newUrl = window.location.pathname + '?' + searchParams.toString();
                window.history.replaceState(null, '', newUrl);

              let product: Product | null = null;
              let purchaseType: string | null = null;
              for (let i = 0; i < products.length; i++) {
                if (products[i].id == parseInt(addPackageCart)) {
                  product = products[i];
                  purchaseType = "Purchase";
                  break;
                }
                for (let j = 0; j < products[i].productOptions.length; j++) {
                  if (products[i].productOptions[j].id == parseInt(addPackageCart)) {
                    product = products[i];
                    product.id = products[i].productOptions[j].id;
                    purchaseType = products[i].productOptions[j].name;
                    break;
                  }
                }
              }
              if (!product || !product.id) { return }
              if (IsProductInCart(product, user)) { return }
              const newUser = {...user, packages: [...(user.packages || []), {
                id: product.id,
                type: product.type,
                name: product.name,
                purchaseType: purchaseType,
                image: product.image,
                in_basket: {
                  gift_username: null,
                  gift_username_id: null,
                  price: product.base_price,
                  quantity: 1,
                }
              } as BasketPackage]
              }
              setUser(newUser)
                //   setUserState(newUser);
              AddPackageToCart(user.ident, user.discord?.id, product.id, product.name + " (" + purchaseType + ")", toast);
            }
            const newUrl = window.location.pathname + '?' + searchParams.toString();
            window.history.replaceState(null, '', newUrl);
        }
        else {
            // setUserState(user);
        }
    }, [user]);
    return (
        <div className="w-full flex flex-col gap-2 pt-0 gap-4">
            {categories["featured"].products.length > 0 && (
                <>
                <div className="animate-appear flex flex-col items-center">
                    <div className="animate-appear text-2xl font-semibold text-center">Featured Deals</div>
                    <div className="text-muted-foreground text-sm text-center">Want to grab a bunch of stuff for a cheaper price? Check out our featured deals!</div>
                </div>
                <div className={`grid gap-4 grid-cols-1 sm:grid-cols-${2 > categories["featured"].products.length ? categories["featured"].products.length : 2} md:grid-cols-${3 > categories["featured"].products.length ? categories["featured"].products.length : 3} lg:grid-cols-${4 > categories["featured"].products.length ? categories["featured"].products.length : 4}`}>
                    {categories["featured"].products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
                </>
            )}
            <div className="animate-appear flex flex-col items-center">
                <div className="animate-appear text-2xl font-semibold text-center">Products</div>
                <div className="text-muted-foreground text-sm text-center">Over {categories["all"].products.length}+ products to choose from, check them out!</div>
            </div>
            <Tabs defaultValue="all">
            <div style={{height: 36}} className="relative rounded-sm sm:overflow-x-auto overflow-x-scroll bg-muted">
                <TabsList className="absolute flex flex-row justify-stretch w-full select-none">
                    {categoriesOrder.map((category) => (
                        <TabsTrigger className="w-full rounded-sm" key={category} value={category}>
                            {categories[category].label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </div>
                {categoriesOrder.map((category) => {
                    if (!categories[category as keyof typeof categories]) { return null }
                    return (
                        <TabsContent key={category} value={category}>
                            <div className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                {categories[category].products.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        </TabsContent>
                    )
                })}
            </Tabs>
        </div>
    )
}