import { useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';

const Live2DContainer = styled.div`
  position: fixed;
  bottom: 0;
  right: 0;
  z-index: 9999;
  pointer-events: none;

  #waifu {
    position: fixed;
    bottom: 0;
    right: 0;
    z-index: 9999;
    pointer-events: auto;
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const Live2D = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isLoaded = useRef(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 只在桌面端显示
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 768) {
      console.log('[Live2D] Mobile device detected, skipping Live2D');
      return;
    }
    if (isLoaded.current) {
      console.log('[Live2D] Already loaded, skipping');
      return;
    }

    console.log('[Live2D] Starting to load Live2D...');

    // 使用多个 CDN 源作为备选
    const cdnPaths = [
      'https://cdn.jsdelivr.net/gh/dogxii/live2d-widget-v3@main/',
      'https://fastly.jsdelivr.net/gh/dogxii/live2d-widget-v3@main/',
      'https://gcore.jsdelivr.net/gh/dogxii/live2d-widget-v3@main/',
    ];

    const loadWithCDN = async (cdnPath: string) => {
      console.log('[Live2D] Trying CDN:', cdnPath);

      const config = {
        path: {
          homePath: '/',
          modelPath: cdnPath + 'Resources/',
          cssPath: cdnPath + 'waifu.css',
          tipsJsonPath: cdnPath + 'waifu-tips.json',
          tipsJsPath: cdnPath + 'waifu-tips.js',
          live2dCorePath: cdnPath + 'Core/live2dcubismcore.js',
          live2dSdkPath: cdnPath + 'live2d-sdk.js',
        },
        tools: [
          'hitokoto',
          'asteroids',
          'express',
          'switch-model',
          'switch-texture',
          'photo',
          'info',
          'quit',
        ],
        drag: {
          enable: true,
          direction: ['x', 'y'] as const,
        },
        switchType: 'order' as const,
      };

      // 异步加载资源
      const loadExternalResource = (url: string, type: 'css' | 'js'): Promise<string> => {
        return new Promise((resolve, reject) => {
          console.log('[Live2D] Loading resource:', url);
          let tag: HTMLLinkElement | HTMLScriptElement | null = null;
          if (type === 'css') {
            tag = document.createElement('link');
            tag.rel = 'stylesheet';
            (tag as HTMLLinkElement).href = url;
          } else if (type === 'js') {
            tag = document.createElement('script');
            (tag as HTMLScriptElement).src = url;
            tag.async = true;
          }
          if (tag) {
            tag.onload = () => {
              console.log('[Live2D] Resource loaded:', url);
              resolve(url);
            };
            tag.onerror = () => {
              console.error('[Live2D] Failed to load resource:', url);
              reject(url);
            };
            document.head.appendChild(tag);
          }
        });
      };

      // 加载资源并初始化
      await Promise.all([
        loadExternalResource(config.path.cssPath, 'css'),
        loadExternalResource(config.path.live2dCorePath, 'js'),
        loadExternalResource(config.path.live2dSdkPath, 'js'),
        loadExternalResource(config.path.tipsJsPath, 'js'),
      ]);

      console.log('[Live2D] All resources loaded, waiting for initWidget...');

      // 等待脚本加载完成
      return new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds

        const checkInit = setInterval(() => {
          attempts++;
          console.log('[Live2D] Checking initWidget, attempt:', attempts);

          if (typeof (window as any).initWidget === 'function') {
            clearInterval(checkInit);
            console.log('[Live2D] initWidget found, initializing...');

            try {
              (window as any).initWidget({
                waifuPath: config.path.tipsJsonPath,
                cdnPath: config.path.modelPath,
                tools: config.tools,
                dragEnable: config.drag.enable,
                dragDirection: config.drag.direction,
                switchType: config.switchType,
              });

              isLoaded.current = true;
              setIsVisible(true);
              console.log('[Live2D] Initialized successfully!');
              resolve();
            } catch (error) {
              console.error('[Live2D] Failed to initialize:', error);
              reject(error);
            }
          }

          if (attempts >= maxAttempts) {
            clearInterval(checkInit);
            console.error('[Live2D] Timeout waiting for initWidget');
            reject(new Error('Timeout waiting for initWidget'));
          }
        }, 100);
      });
    };

    // 尝试加载，失败则切换 CDN
    const tryLoad = async () => {
      for (let i = 0; i < cdnPaths.length; i++) {
        try {
          await loadWithCDN(cdnPaths[i]);
          return; // 成功则退出
        } catch (error) {
          console.error(`[Live2D] CDN ${i + 1} failed:`, error);
          if (i === cdnPaths.length - 1) {
            console.error('[Live2D] All CDNs failed');
          }
        }
      }
    };

    tryLoad();

    return () => {
      // 清理 Live2D
      const waifu = document.getElementById('waifu');
      if (waifu) {
        waifu.remove();
      }
    };
  }, []);

  return <Live2DContainer ref={containerRef} data-visible={isVisible} />;
};

export default Live2D;
