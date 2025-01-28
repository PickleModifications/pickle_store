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
import { getPriceString, getProducts, performCartAction } from "@/utils";
import { useUser, User } from "@/providers/user";
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Config, useConfig } from "@/providers/config";
import { fetchNui } from "@/providers/nui/fetchNui";
import { useLoading } from "@/providers/loading";
import { Edit, PlusIcon, Save, Trash, Trash2 } from "lucide-react";

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
    id: number | string
    isCoinPackage?: boolean
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
    commands: string[]
}
  
export function AddPackageToCart(ident: string, tebexApiKey: string, discord: string | undefined, packageId: number, name: string, fallbackLink: string, cb: (message: string) => void) {
    fetchNui("purchaseProduct", packageId).then((tebexResult: any) => {
        const tebexBuyUrl = tebexResult.url;
        const directCheckout = tebexResult.directCheckout;
        async function onActionComplete(message: string) {
            window.postMessage({
                type: "openRedeemMenu",
                visible: true
            }, '*');
            cb(message);
        }
        async function fallback() {
            (window as any).invokeNative('openUrl', fallbackLink);
            setTimeout(() => {
                onActionComplete("Your FiveM is not linked to CFX, you will need to redeem your transaction ID after purchase.");
            }, 1000)
        }
        async function tick() {
            if (tebexBuyUrl) {
                if (directCheckout) {
                    const req = await fetch(tebexBuyUrl as string, {mode: 'no-cors'})
                    if (req.url) {
                        const url = new URL(req.url);
                        const basketId = url.searchParams.get("basket");
                        if (basketId) {
                            await performCartAction(basketId, tebexApiKey, packageId, undefined, discord);
                            (window as any).invokeNative('openUrl', "https://pay.tebex.io/" + basketId);
                        }
                        else {
                            (window as any).invokeNative('openUrl', tebexBuyUrl);
                        }
                    }
                    else {
                        (window as any).invokeNative('openUrl', tebexBuyUrl);
                    }
                    setTimeout(() => {
                        onActionComplete("Opened Tebex Checkout!");
                    }, 1000);
                }
                else {
                    setTimeout(() => {
                        onActionComplete("Opened Tebex Checkout!");
                    }, 1000);
                    (window as any).invokeNative('openUrl', tebexBuyUrl);
                }
            }
            else {
                fallback()
            }
        }
        tick();
    });
}

type EditState = {
    id: string | number
    name: string
    description: string
    image: string
    category: string
    videoUrl: string
    base_price: number
    currency: string
    discount: number
    productOptions: ProductOption[]
    groups: string[]
    selectedCategory: string
    commands: string[]
}

export function ProductCard({ product }: { product: Product }) {
    const {config} = useConfig();
    const {user, setUser} = useUser();
    const {toast} = useToast();
    const [userState, setUserState] = useState<User | null>(null);
    const [configState, setConfigState] = useState(config);
    const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
    const {setLoading} = useLoading();
    const [editState, setEditState] = useState<EditState | null>(null);
    const data = getCategorizedProducts(userState, configState);
    const categories = data.categories;
    const categoriesOrder = data.categoriesOrder;
    let commandsListed: { [key: string]: number } = {};
    useEffect(() => { setUserState(user) }, [user]);
    useEffect(() => { setConfigState(config) }, [config]);
    useEffect(() => {
        if (thumbnailLoaded) { return }
        setThumbnailLoaded(true);
    }, []);
    return (
        <Dialog onOpenChange={(open) => {
                if (!open) {
                    setTimeout(() => {
                        setEditState(null);
                    }, 200);
                }
            }}>
                <DialogTrigger>
                    <div className="bg-zinc-900 rounded-md animate-appear relative select-none cursor-pointer filter brightness-80 hover:brightness-125 hover:scale-90 hover:z-1 z-0 scale-100 transition ease-in duration-200">
                        <AspectRatio className="flex" ratio={16 / 9}>
                            <Image className="rounded-md max-h-full" src={product.image} alt="" width={"100%"} height={"100%"}/>
                            <div className="absolute bottom-0 left-0 m-2 pl-2 pr-2 bg-background rounded-xl bg-opacity-75">
                                <span className="text-sm font-semibold">{product.name}</span>
                            </div>
                        </AspectRatio>
                        {thumbnailLoaded && (<div style={{paddingBottom: 2}} className="absolute top-0 left-0 m-2 pl-2 pr-2 bg-background rounded-xl bg-opacity-5">
                            {product.isCoinPackage ? (
                                <div style={{paddingTop: 2, paddingBottom: 1}} className="flex flex-row items-center gap-1">
                                    <img className="w-4 h-4 rounded-sm" src={configState.coinCurrency?.image} alt=""/>
                                    <span className="text-sm font-semibold">{product.base_price.toLocaleString()}</span> 
                                </div>
                            ) : (
                                <>
                                    {product.discount > 0 && (
                                        <span className="text-xs font-semibold text-red-500 line-through pr-1">${(product.base_price + product.discount).toFixed(2)}</span>
                                    )}
                                    <span className="text-sm font-semibold">{getPriceString(product.base_price, product.type, product.currency)}</span>
                                </>
                            )}
                        </div>)}
                    </div>
                </DialogTrigger>
                <DialogContent>
                <DialogHeader  style={{minWidth: 400}}>
                    {editState ? (
                        <>
                            <DialogTitle className="flex flex-row items-center gap-2 pr-4">
                                <span>Editing: {editState.name}</span>
                            </DialogTitle>
                            <div className="flex flex-col gap-4 pt-4 relative">
                                {product.id.toString().startsWith("coin") && (
                                    <div className="flex flex-col gap-2 max-h-96 pr-2 overflow-y-auto">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-semibold">Name</label>
                                            <input
                                                placeholder="Product Name"
                                                type="text"
                                                value={editState.name}
                                                onChange={(e) => setEditState({ ...editState, name: e.target.value })}
                                                className="p-2 border rounded-md bg-zinc-900 text-white"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-semibold">Description</label>
                                            <textarea
                                                placeholder="Product Description"
                                                style={{height: 75}}
                                                value={editState.description}
                                                onChange={(e) => setEditState({ ...editState, description: e.target.value })}
                                                className="p-2 border text-xs rounded-md bg-zinc-900 text-white resize-none"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-semibold">Image URL</label>
                                            <input
                                                type="text"
                                                placeholder="Image URL"
                                                value={editState.image}
                                                onChange={(e) => setEditState({ ...editState, image: e.target.value })}
                                                className="p-2 border rounded-md bg-zinc-900 text-white"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-semibold">Coins</label>
                                            <input
                                                type="number"
                                                placeholder={"Amount of "+configState.coinCurrency?.plural.toLowerCase()+" to charge"}
                                                value={editState.base_price}
                                                onChange={(e) => setEditState({ ...editState, base_price: parseFloat(e.target.value) })}
                                                className="p-2 border rounded-md bg-zinc-900 text-white"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-semibold">Commands</label>
                                            <div className="flex flex-col gap-2">
                                                {editState.commands.map((command, index) => (
                                                    <div key={index} className="flex flex-row gap-2 items-center">
                                                        <input
                                                            type="text"
                                                            value={command}
                                                            placeholder="pts_giveitem {pts_server_id} bread 10"
                                                            onChange={(e) => {
                                                                const newCommands = [...editState.commands];
                                                                newCommands[index] = e.target.value;
                                                                setEditState({ ...editState, commands: newCommands });
                                                            }}
                                                            className="p-2 border rounded-md bg-zinc-900 text-white flex-1"
                                                            spellCheck={false}
                                                        />
                                                        <Button variant="destructive" onClick={() => {
                                                            const newCommands = editState.commands.filter((_, i) => i !== index);
                                                            setEditState({ ...editState, commands: newCommands });
                                                        }}>
                                                            Delete
                                                        </Button>
                                                    </div>
                                                ))}
                                                <Button variant="secondary" onClick={() => {
                                                    setEditState({ ...editState, commands: [...editState.commands, ""] });
                                                }}>
                                                    Add Command
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-semibold">Category</label>
                                    <select
                                        value={editState.selectedCategory}
                                        onChange={(e) => setEditState({ ...editState, selectedCategory: e.target.value })}
                                        className="p-2 border rounded-md bg-zinc-900 text-white"
                                    >
                                        <option key={"all"} value={"all"}>
                                            No Category Selected
                                        </option>
                                        {categoriesOrder.map((category) => (
                                            category !== "all" && (
                                                <option key={category} value={category}>
                                                    {categories[category].label}
                                                </option>
                                            )
                                        ))}
                                        <option value="new">Enter new category</option>
                                    </select>
                                    {editState.selectedCategory === "new" && (
                                        <input
                                            type="text"
                                            placeholder="New category"
                                            onChange={(e) => setEditState({ ...editState, category: e.target.value })}
                                            className="p-2 border rounded-md bg-zinc-900 text-white mt-2"
                                        />
                                    )}
                                </div>
                                <div className="flex flex-row gap-2 items-center justify-between">
                                    <div className="flex flex-row gap-2">
                                        <Button variant="secondary" onClick={() => {
                                            fetchNui("updateProduct", editState)
                                            setEditState(null);
                                        }}>
                                            <Save size={16}/>
                                        </Button>
                                        {product.id.toString().startsWith("coin") && (
                                            <Button variant="destructive" onClick={() => {
                                                fetchNui("deleteProduct", editState)
                                                setEditState(null);
                                            }}>
                                                <Trash2 size={16}/>
                                            </Button>
                                        )}
                                    </div>
                                    <Button variant="secondary" onClick={() => {
                                        setEditState(null);
                                    }}>
                                        Discard Changes
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <DialogTitle className="flex flex-row items-center gap-2">
                                {(configState.permissions.manageProducts) && (<Edit size={16} className="cursor-pointer hover:text-zinc-400" onClick={() => {
                                    const category = getProductCategory(product.id, categories);
                                    setEditState({
                                        id: product.id,
                                        name: product.name,
                                        description: product.description,
                                        category: category,
                                        selectedCategory: category,
                                        image: product.image,
                                        videoUrl: product.videoUrl || "",
                                        base_price: product.base_price,
                                        currency: product.currency,
                                        discount: product.discount,
                                        productOptions: product.productOptions,
                                        groups: product.groups,
                                        commands: product.commands,
                                    });
                                }}/>)}
                                <span>{product.name}</span>
                            </DialogTitle>
                            <div className="text-sm text-muted-foreground" style={{position: "relative"}}>
                                <div className="flex flex-col gap-4 mt-4 relative">
                                    <div className="flex flex-col gap-2">
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
                                    <div className="flex flex-col gap-2">
                                        {product.commands && product.commands.map((command, index) => {
                                            const commandName = command.split(" ")[0];
                                            const commandCfg = configState.customCommands[commandName];
                                            let iterator = "";
                                            if (commandsListed[commandName]) {
                                                commandsListed[commandName]++;
                                                iterator = " #" + commandsListed[commandName];
                                            }
                                            else {
                                                commandsListed[commandName] = 1;
                                            }
                                            if (commandCfg && commandCfg.fields) {
                                                return (
                                                    <div key={index} className="flex flex-col gap-2">
                                                        <span className="text-sm font-semibold">{commandCfg.label}{iterator}</span>
                                                        {commandCfg.fields.map((field, i) => (
                                                            <div key={i} className="flex flex-col gap-1">
                                                                <div key={i + "_"} className="flex flex-col gap-1">
                                                                    <span className="text-xs font-semibold">{field.label}</span>
                                                                    <span className="text-xs text-muted-foreground">{field.description}</span>
                                                                </div>
                                                                <input id={"input-fields-"+index+"-"+i} key={i} type="text" placeholder={field.placeholder} className="p-1 font-xs border rounded-md bg-zinc-900 text-white"/>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )
                                            }
                                        })}
                                        {product.isCoinPackage && (
                                            <Button className="w-full" variant="secondary" onClick={() => {
                                                const fields = (product.commands ? product.commands.map((command, index) => {
                                                    const commandName = command.split(" ")[0];
                                                    const commandCfg = configState.customCommands[commandName];
                                                    if (commandCfg && commandCfg.fields) {
                                                        return commandCfg.fields.map((field, i) => {
                                                            const input = document.querySelector("#input-fields-"+index+"-"+i) as HTMLInputElement;
                                                            return input ? input.value : "";
                                                        });
                                                    }
                                                    return [];
                                                }) : []);
                                                fetchNui("purchaseCoinProduct", { productId: product.id, fields });
                                            }}> <div>
                                                    <span>Purchase for</span> <img src={configState.coinCurrency?.image} alt="" className="rounded-sm w-4 h-4 inline-block" /> <span>{product.base_price.toLocaleString()}</span>
                                                </div>
                                            </Button>
                                        )}
                                        {(product.productOptions.map((option: ProductOption) => (
                                            (userState && userState.ident) && (
                                                <Button key={option.id} className="w-full" variant="secondary" onClick={() => {
                                                    setLoading(
                                                        <div className="flex flex-col items-center justify-center">
                                                        <div className="flex items-center gap-2">
                                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            <div className="text-xl font-bold	">Opening Tebex Checkout...</div> 
                                                        </div>
                                                        <div className="text-md text-muted-foreground">Please wait 3-5 seconds for the checkout window to open.</div>
                                                        </div>
                                                    )
                                                    AddPackageToCart(userState.ident, configState.tebexApiKey, userState.discord?.id, option.id, product.name + " (" + option.name + ")", configState.tebexStoreUrl, (message) => {
                                                        setLoading();
                                                    })
                                                }}>{option.name}: {
                                                    <>
                                                    {option.discount > 0 && (
                                                        <span className="text-red-500 line-through">${(option.base_price + option.discount).toFixed(2)}</span>
                                                    )}
                                                    <span className="font-semibold">{getPriceString(option.base_price, product.type, product.currency)}</span>
                                                    </>
                                                }</Button>
                                            )
                                        ))
                                    )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                <DialogDescription className="hidden"/>
                </DialogHeader>
                </DialogContent>
        </Dialog>
    );
}

function getProductCategory(productId: number | string, categories: { [key: string]: { label: string, products: Product[] } }) {
    for (const category in categories) {
        if (category != "all" && categories[category].products.find((product) => product.id === productId)) {
            return category;
        }
    }
    return "all";
}

function getCategorizedProducts(userState: User | null, configState: Config) {
    if (!userState || !configState) { return { categories: {}, categoriesOrder: [] } }
    let categories: { [key: string]: { label: string, products: Product[] } } = {
        "all": {label: "All Products", products: []},
    };
    let categoriesOrder = ["all"];
    if (userState && userState.products) {
        for (const configProduct of configState.productInfo || []) {
            let targetCategory = "all";
            if (configProduct.category) {
                targetCategory = configProduct.category;
                if (!categories[configProduct.category]) {
                    categories[configProduct.category] = {label: configProduct.category, products: []};
                    categoriesOrder.push(configProduct.category);
                }
            }
            if (configProduct.id.toString().startsWith("coin") && !configProduct.packageId && categories[targetCategory]) {
                categories[targetCategory].products.push({
                    id: configProduct.id,
                    isCoinPackage: true,
                    type: "single",
                    name: configProduct.title,
                    base_price: configProduct.coins || -1,
                    productOptions: [],
                    description: configProduct.description,
                    image: configProduct.image,
                    discount: 0,
                    currency: "USD",
                    groups: [],
                    commands:configProduct.commands || [],
                });
                if (targetCategory != "all") {
                    categories["all"].products.push({
                        id: configProduct.id,
                        isCoinPackage: true,
                        type: "single",
                        name: configProduct.title,
                        base_price: configProduct.coins || -1,
                        productOptions: [],
                        description: configProduct.description,
                        image: configProduct.image,
                        discount: 0,
                        currency: "USD",
                        groups: [],
                        commands:configProduct.commands || [],
                    });
                }
            }
        }
        for (const product of userState.products) {
            const productId = product.id;
            for (const configProduct of configState.productInfo || []) {
                if (configProduct.id == productId) {
                    if (configProduct.category) {
                        categories[configProduct.category].products.push(product);
                    }
                }
            }
            categories["all"].products.push(product);
        }
    }
    return { categories, categoriesOrder };
}

export function Products() {
    const {toast} = useToast();
    const {config} = useConfig();
    const {user, setUser} = useUser();
    const [userState, setUserState] = useState<User | null>(null);
    const [configState, setConfigState] = useState(config);
    useEffect(() => { setConfigState(config) }, [config]);
    useEffect(() => { setUserState(user) }, [user]);
    const [firstLoad, setFirstLoad] = useState(true);
    const [newProductState, setNewProductState] = useState<EditState | null>(null);
    const [isAddingProduct, setIsAddingProduct] = useState(false);
    let data = getCategorizedProducts(userState, configState);
    let categories = data.categories;
    let categoriesOrder = data.categoriesOrder;
    return (
        <>
            <div className="w-full flex flex-col gap-2 pt-0 gap-4">
                <div className="animate-appear flex flex-col items-center">
                    <div className="animate-appear text-2xl font-semibold text-center">Products</div>
                    <div className="text-muted-foreground text-sm text-center">Over {(categories["all"] ? categories["all"].products.length : 0)}+ products to choose from, check them out!</div>
                </div>
                <Tabs defaultValue="all">
                <div style={{height: 36}} className="relative rounded-sm sm:overflow-x-auto overflow-x-scroll bg-muted">
                    <TabsList className="absolute flex flex-row justify-stretch w-full select-none">
                        {categoriesOrder.map((category) => (
                            categories[category] && (
                                <TabsTrigger className="w-full rounded-sm" key={category} value={category}>
                                    {categories[category].label}
                                </TabsTrigger>
                            ) || null
                        ))}
                    </TabsList>
                </div>
                    {categoriesOrder.map((category) => {
                        if (!categories[category as keyof typeof categories]) { return null }
                        return (
                            <TabsContent key={category} value={category}>
                                {configState.permissions.manageProducts && (
                                    <Dialog open={isAddingProduct} onOpenChange={(open) => {
                                            if (!open) {
                                                setTimeout(() => {
                                                    if (!isAddingProduct) {
                                                        setNewProductState(null);
                                                    }
                                                }, 200);
                                            }
                                            setIsAddingProduct(open);
                                        }}>
                                            <DialogTrigger>
                                                <div className="flex flex-row gap-2 pt-2 items-center w-full">
                                                    <Button className="w-full" variant="secondary" onClick={() => {
                                                        setNewProductState({
                                                            id: -1,
                                                            name: "",
                                                            description: "",
                                                            image: "",
                                                            category: "",
                                                            videoUrl: "",
                                                            base_price: 0,
                                                            currency: "USD",
                                                            discount: 0,
                                                            productOptions: [],
                                                            groups: [],
                                                            selectedCategory: "all",
                                                            commands: [],
                                                        });
                                                    }}>
                                                        <PlusIcon size={16}/> Add Product
                                                    </Button>
                                                </div>
                                            </DialogTrigger>
                                            <DialogContent>
                                            <DialogHeader  style={{minWidth: 400}}>
                                                {newProductState && (
                                                    <>
                                                        <DialogTitle className="flex flex-row items-center gap-2 pr-4">
                                                            <span>Creating New Product</span>
                                                        </DialogTitle>
                                                        <div className="flex flex-col gap-4 pt-4 relative">
                                                            <div className="flex flex-col gap-2 max-h-96 pr-2 overflow-y-auto">
                                                                <div className="flex flex-col gap-2">
                                                                    <label className="text-sm font-semibold">Name</label>
                                                                    <input
                                                                        type="text"
                                                                        value={newProductState.name}
                                                                        placeholder="Product Name"
                                                                        onChange={(e) => setNewProductState({ ...newProductState, name: e.target.value })}
                                                                        className="p-2 border rounded-md bg-zinc-900 text-white"
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col gap-2">
                                                                    <label className="text-sm font-semibold">Description</label>
                                                                    <textarea
                                                                        placeholder="Product Description"
                                                                        style={{height: 75}}
                                                                        value={newProductState.description}
                                                                        onChange={(e) => setNewProductState({ ...newProductState, description: e.target.value })}
                                                                        className="p-2 border text-xs rounded-md bg-zinc-900 text-white resize-none"
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col gap-2">
                                                                    <label className="text-sm font-semibold">Image URL</label>
                                                                    <input
                                                                        placeholder="Image URL"
                                                                        type="text"
                                                                        value={newProductState.image}
                                                                        onChange={(e) => setNewProductState({ ...newProductState, image: e.target.value })}
                                                                        className="p-2 border rounded-md bg-zinc-900 text-white"
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col gap-2">
                                                                    <label className="text-sm font-semibold">{configState.coinCurrency?.plural}</label>
                                                                    <input
                                                                        placeholder={"Amount of "+configState.coinCurrency?.plural.toLowerCase()+" to charge"}
                                                                        type="number"
                                                                        value={newProductState.base_price}
                                                                        onChange={(e) => setNewProductState({ ...newProductState, base_price: parseFloat(e.target.value) })}
                                                                        className="p-2 border rounded-md bg-zinc-900 text-white"
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col gap-2">
                                                                    <label className="text-sm font-semibold">Commands</label>
                                                                    <div className="flex flex-col gap-2">
                                                                        {newProductState.commands.map((command, index) => (
                                                                            <div key={index} className="flex flex-row gap-2 items-center">
                                                                                <input
                                                                                    type="text"
                                                                                    value={command}
                                                                                    placeholder="pts_giveitem {pts_server_id} bread 10"
                                                                                    onChange={(e) => {
                                                                                        const newCommands = [...newProductState.commands];
                                                                                        newCommands[index] = e.target.value;
                                                                                        setNewProductState({ ...newProductState, commands: newCommands });
                                                                                    }}
                                                                                    className="p-2 border rounded-md bg-zinc-900 text-white flex-1"
                                                                                    spellCheck={false}
                                                                                />
                                                                                <Button variant="destructive" onClick={() => {
                                                                                    const newCommands = newProductState.commands.filter((_, i) => i !== index);
                                                                                    setNewProductState({ ...newProductState, commands: newCommands });
                                                                                }}>
                                                                                    Delete
                                                                                </Button>
                                                                            </div>
                                                                        ))}
                                                                        <Button variant="secondary" onClick={() => {
                                                                            setNewProductState({ ...newProductState, commands: [...newProductState.commands, ""] });
                                                                        }}>
                                                                            Add Command
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col gap-2">
                                                                <label className="text-sm font-semibold">Category</label>
                                                                <select
                                                                    value={newProductState.selectedCategory}
                                                                    onChange={(e) => setNewProductState({ ...newProductState, selectedCategory: e.target.value })}
                                                                    className="p-2 border rounded-md bg-zinc-900 text-white"
                                                                >
                                                                    <option key={"all"} value={"all"}>
                                                                        No Category Selected
                                                                    </option>
                                                                    {categoriesOrder.map((category) => (
                                                                        category !== "all" && (
                                                                            <option key={category} value={category}>
                                                                                {categories[category].label}
                                                                            </option>
                                                                        )
                                                                    ))}
                                                                    <option value="new">Enter new category</option>
                                                                </select>
                                                                {newProductState.selectedCategory === "new" && (
                                                                    <input
                                                                        type="text"
                                                                        placeholder="New category"
                                                                        onChange={(e) => setNewProductState({ ...newProductState, category: e.target.value })}
                                                                        className="p-2 border rounded-md bg-zinc-900 text-white mt-2"
                                                                    />
                                                                )}
                                                            </div>
                                                            <div className="flex flex-row gap-2 items-center justify-between">
                                                                <div className="flex flex-row gap-2">
                                                                    <Button variant="secondary" onClick={() => {
                                                                        fetchNui("createProduct", newProductState)
                                                                        setIsAddingProduct(false);
                                                                    }}>
                                                                        Create Product
                                                                    </Button>
                                                                </div>
                                                                <Button variant="secondary" onClick={() => {
                                                                    setIsAddingProduct(false);
                                                                }}>
                                                                    Cancel Creation
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                                <DialogDescription className="hidden"/>
                                            </DialogHeader>
                                            </DialogContent>
                                    </Dialog>
                                )}
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

        </>
    )
}