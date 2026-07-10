import { createContext, type FC, type PropsWithChildren } from 'react'

type DetailContentContainerContextProps = {
  fullHeight?: boolean
}

type DetailContentContainerProviderProps = PropsWithChildren<{
  fullHeight?: boolean
}>

export const DetailContentContainerContext =
  createContext<DetailContentContainerContextProps>({})

export const DetailContentContainerProvider: FC<
  DetailContentContainerProviderProps
> = ({ children, fullHeight }) => {
  return (
    <DetailContentContainerContext.Provider value={{ fullHeight }}>
      {children}
    </DetailContentContainerContext.Provider>
  )
}
