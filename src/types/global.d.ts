export interface MusicCapsuleConfig {
  enable?: boolean;
  id?: string | number;
  server?: 'netease' | 'tencent' | 'xiami' | 'kugou' | 'baidu';
  type?: 'playlist' | 'song' | 'album' | 'artist' | 'search';
  meting_api?: string;
  volume?: number;
}

export interface GwitterConfig {
  request?: {
    token?: string;
    clientID?: string;
    clientSecret?: string;
    pageSize?: number;
    autoProxy?: string;
    owner?: string;
    repo?: string;
  };
  app?: {
    onlyShowOwner?: boolean;
    enableRepoSwitcher?: boolean;
    enableAbout?: boolean;
    enableEgg?: boolean;
  };
  music?: MusicCapsuleConfig;
}

export interface GwitterOptions {
  container?: HTMLElement;
  config?: GwitterConfig;
}

declare global {
  interface Window {
    gwitter?: (options?: GwitterOptions) => void;
    initWidget?: (config: {
      waifuPath: string;
      cdnPath: string;
      tools: string[];
      dragEnable: boolean;
      dragDirection: readonly string[];
      switchType: string;
    }) => void;
  }
}
