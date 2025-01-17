import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import { User } from './components/cart/Cart'
import { useUser } from './providers/user'
import { Product, Products } from './components/product/Product'
import Navbar from './components/navbar/Navbar'
import { Config, useConfig } from './providers/config'

export type Store = {
  products: Product[]
}

export type CustomPage = {
  label: string;
  content: string;
}

function App() {
  const { user } = useUser();
  const config = useConfig();
  const [visible, setVisible] = useState(true)
  const [userState, setUserState] = useState<User | null>(user);
  const [configState, setConfigState] = useState<Config>(config);
  const [store, setStore] = useState<Store | null>();
  const [selectedPage, setSelectedPage] = useState(0);
  let pages = [
    {
      label: "Products",
      content: <Products/>
    }
  ];
  for (let i = 0; i < configState.customPages.length; i++) {
    const page = configState.customPages[i];
    pages.push({
      label: page.label,
      content: <div dangerouslySetInnerHTML={{ __html: page.content }} />
    });
  }
  useEffect(() => {
    setConfigState(config);
  }, [config]);
  useEffect(() => {
    setUserState(user);
  }, [user]);
  
  return visible && (
    <div className="w-screen h-screen absolute top-0 left-0">
      <div className="bg-zinc-950 absolute rounded-md" style={{ width: 1280, height: 720, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
        <Navbar pages={pages} onPageSelect={(id: number) => {
          setSelectedPage(id);
        }} />
        <div style={{ overflowY: 'auto', maxHeight: 'calc(100% - 53px)', padding: 12}}>
          {pages[selectedPage].content}
        </div>
        <div className="transform transform-z-0" id='dialog-container' style={{position: "absolute", top: 0, left: 0, width: "100%", height: "100%", overflow: "hidden", pointerEvents: "none", zIndex: 100}}></div>
      </div>
    </div>
  )
}

export default App
