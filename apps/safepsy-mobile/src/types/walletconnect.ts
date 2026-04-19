import { EthereumProvider } from '@walletconnect/ethereum-provider';

export type WcEthereumProvider = Awaited<ReturnType<typeof EthereumProvider.init>>;
