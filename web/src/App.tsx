import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import { useUser, User } from './providers/user'
import { Product, Products } from './components/product/Product'
import Navbar from './components/navbar/Navbar'
import { Config, useConfig } from './providers/config'
import { LoadingProvider, useLoading } from './providers/loading'
import { useNuiEvent } from './providers/nui/useNui'
import { fetchNui } from './providers/nui/fetchNui'
import { createGlobalStyle } from 'styled-components';

export type Store = {
  products: Product[]
}

export type CustomPage = {
  label: string;
  content: string;
}

function App() {
  const { user } = useUser();
  const {config} = useConfig();
  const [userState, setUserState] = useState<User | null>(user);
  const [configState, setConfigState] = useState<Config>(config);
  const {isLoading, setLoading} = useLoading();
  const [loadingState, setLoadingState] = useState(isLoading);
  useEffect(() => { setLoadingState(isLoading) }, [isLoading]);
  const [selectedPage, setSelectedPage] = useState(0);
  const [open, setOpen] = useState(false)
  const [opening, setOpening] = useState(false)
  const setVisible = (visible: boolean) => {
    if (visible) {
      setOpen(true);
      setOpening(true);
    }
    else {
      setOpening(false);
      setTimeout(() => {
        setOpen(false);
      }, 200);
    }
  }
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
  useNuiEvent("setVisible", (data) => {
    setVisible(data.visible);
  });
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setVisible(false);
        fetchNui("setVisible", false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  console.log(configState.theme)
  return (
    <div className="w-screen h-screen absolute top-0 left-0">
        <div className="bg-background absolute rounded-md transition-opacity duration-200" style={{ opacity: (opening ? 1 : 0), width: 1280, height: 720, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
          {open && (
            <>
              <Navbar pages={pages} onPageSelect={(id: number) => {
                setSelectedPage(id);
              }} />
              <div style={{ overflowY: 'auto', maxHeight: 'calc(100% - 53px)', padding: 12}}>
                {pages[selectedPage].content}
              </div>
              <div className="transform transform-z-0 rounded-md" id='dialog-container' style={{position: "absolute", top: 0, left: 0, width: "100%", height: "100%", overflow: "hidden", pointerEvents: "none", zIndex: 100}}></div>
              <div className="transform transform-z-0 rounded-md" id='loading-container' style={{position: "absolute", top: 0, left: 0, width: "100%", height: "100%", overflow: "hidden", pointerEvents: "none", zIndex: 150}}>
                {loadingState && (<div className="pointer-events-auto select-none flex justify-center items-center w-full h-full bg-opacity-50 backdrop-blur-sm"> 
                  {loadingState}
                </div>)}
              </div>
            </>
          )}
        </div>
    </div>
  )
}

export default App
