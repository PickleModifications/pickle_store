import { User } from "@/providers/user";
import { Product } from "@/components/product/Product";
import { ProductOption } from "@/components/product/Product";
export let products: Product[] = [];

export type Category = {
    id: number;
    name: string;
    slug: string;
    description: string;
    parent: string;
    packages: Product[] | null;
}

export function getBaseURL() {
  return process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : window.location.origin;
}

export function getPriceString(price: number, productType: string | "single", currency: string) {
  const locale = navigator.language || 'en-US';
  return price.toLocaleString(
    locale,
    {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  ) + (productType === "subscription" ? "/mo" : "") + " " + currency;
}

export async function getProducts(id: string, tebexApiKey: string) {
  if (products.length == 0) {
    const response = await fetch('https://headless.tebex.io/api/accounts/'+tebexApiKey+'/packages?basketIdent='+id, {
      method: 'GET',
      headers: {}
    });
    const data = await response.json();
    const packages = data.data;
    const parsedPackages: Product[] = [];
    for (let i = 0; i < packages.length; i++) {
        const tbxPackage = packages[i];
        if (tbxPackage && tbxPackage.id && !tbxPackage.name.includes("[Source]")) {
            const productOptions: ProductOption[] = [
                {
                    id: tbxPackage.id,
                    name: "Purchase",
                    discount: tbxPackage.discount,
                    base_price: tbxPackage.base_price
                }
            ];
            for (let j = 0; j < packages.length; j++) {
                const targetName = "[Source] " + tbxPackage.name;
                const tbxOptionPackage = packages[j];
                if (tbxOptionPackage && tbxOptionPackage.name == targetName && tbxOptionPackage.id) {
                    productOptions.push({
                        id: tbxOptionPackage.id,
                        name: "Source",
                        discount: tbxOptionPackage.discount,
                        base_price: tbxOptionPackage.base_price
                    });
                }
            }
            const videoUrl = tbxPackage.description.match(/\[VIDEO\](.*?)\[\/VIDEO\]/);
            tbxPackage.description = tbxPackage.description.replace(/<p>\[VIDEO\].*?\[\/VIDEO\]<\/p>/, '');
            const rawGroupIds = tbxPackage.description.match(/\[GROUP_IDS\](.*?)\[\/GROUP_IDS\]/);
            let groups = [];
            if (rawGroupIds) {
              tbxPackage.description = tbxPackage.description.replace(/\[GROUP_IDS\](.*?)\[\/GROUP_IDS\]/, '');
              groups = rawGroupIds[1].split(",");
            }
            parsedPackages.push({
                id: tbxPackage.id,
                type: tbxPackage.type,
                name: tbxPackage.name,
                category: tbxPackage.category,
                videoUrl: videoUrl ? videoUrl[1] : null,
                base_price: tbxPackage.base_price,
                productOptions: productOptions,
                description: tbxPackage.description,
                image: tbxPackage.image,
                discount: tbxPackage.discount,
                currency: tbxPackage.currency,
                groups: groups || [],
                commands: tbxPackage.commands,
            });
        }
    }
    products = parsedPackages;
  }
  return products;
}

export async function getApiUser(id: string, tebexApiKey: string, skipProducts?: boolean) {
  const req = await fetch('https://headless.tebex.io/api/accounts/'+tebexApiKey+'/baskets/'+id, {
      method: 'GET',
      headers: {}
  });
  const data = await req.json();
  if (data && data.data) {
      data.data.status = 200;
      if (skipProducts) {
          return data.data;
      }
      const products = await getProducts(id, tebexApiKey);
      for (let i=0; i<data.data.packages.length; i++) {
          const product = products.find((p) => {
              return p.id == data.data.packages[i].id || p.productOptions.find((o) => o.id == data.data.packages[i].id);
          });
          if (product) {
              data.data.packages[i].name = product.name;
              data.data.packages[i].purchaseType = product.productOptions.find((o) => o.id == data.data.packages[i].id)?.name || "Purchase";
          }
      }
      return data.data;
  }
  else {
      return { error: 'User not found', status: 404 };
  }
}
 
export async function ensureCart(tebexApiKey: string) {
  let user: User | null = null;
  if (!user) {
    const req = await fetch('https://headless.tebex.io/api/accounts/'+tebexApiKey+'/baskets', {
      method: 'POST',
      headers: {},
      body: JSON.stringify({}),
    });
    const data = await req.json();
    if (data && data.data) {
      data.data.status = 200
      user = data.data;
    }
  }
  return user;
}

export async function performCartAction(id: string, tebexApiKey: string, addPackageCart?: number, removePackageCart?: number, discordId?: string) {
  if (!id) {
    return { error: 'ID parameter is required', status: 400 };
  }
  if (addPackageCart) {
      const user = await getApiUser(id, tebexApiKey);
      if (!user || !user.ident) {
          return { error: 'User not found' , status: 404 };
      }
      const payload = {
        package_id: addPackageCart,
        quantity: 1,
        variable_data: {
          discord_id: (discordId || undefined),
          discord_invite_link_to: "placeholder@placeholder.placeholder"
        }
      }
      const response = await fetch('https://headless.tebex.io/api/baskets/'+id+'/packages', {
          method: 'POST',
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
      });
      const data = await response.json();
      return data;
  }
  else if (removePackageCart) {
      const user = await getApiUser(id, tebexApiKey);
      if (!user || !user.ident) {
        return { error: 'User not found' ,  status: 404 };
      }
      const response = await fetch('https://headless.tebex.io/api/baskets/'+id+'/packages/remove', {
          method: 'POST',
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
              package_id: removePackageCart,
          }),
      });
      const data = await response.json();
      return data;
  }
  else {
      return { error: 'Action parameter is required', status: 400 };
  }
}