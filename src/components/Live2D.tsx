import { useEffect, useRef } from 'react';
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

  useEffect(() => {
    // 只在桌面端显示
    if (screen.width < 768) return;
    if (isLoaded.current) return;

    const cdnPath = 'https://cdn.jsdmirror.com/gh/dogxii/live2d-widget-v3@main/';
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
        let tag: HTMLLinkElement | HTMLScriptElement | null = null;
        if (type === 'css') {
          tag = document.createElement('link');
          tag.rel = 'stylesheet';
          (tag as HTMLLinkElement).href = url;
        } else if (type === 'js') {
          tag = document.createElement('script');
          (tag as HTMLScriptElement).src = url;
        }
        if (tag) {
          tag.onload = () => resolve(url);
          tag.onerror = () => reject(url);
          document.head.appendChild(tag);
        }
      });
    };

    // 加载资源并初始化
    Promise.all([
      loadExternalResource(config.path.cssPath, 'css'),
      loadExternalResource(config.path.live2dCorePath, 'js'),
      loadExternalResource(config.path.live2dSdkPath, 'js'),
      loadExternalResource(config.path.tipsJsPath, 'js'),
    ])
      .then(() => {
        // 等待脚本加载完成
        const checkInit = setInterval(() => {
          if (typeof (window as any).initWidget === 'function') {
            clearInterval(checkInit);
            isLoaded.current = true;
            (window as any).initWidget({
              waifuPath: config.path.tipsJsonPath,
              cdnPath: config.path.modelPath,
              tools: config.tools,
              dragEnable: config.drag.enable,
              dragDirection: config.drag.direction,
              switchType: config.switchType,
            });
          }
        }, 100);

        // 10秒后停止检查
        setTimeout(() => clearInterval(checkInit), 10000);
      })
      .catch((err) => {
        console.error('Failed to load Live2D resources:', err);
      });

    return () => {
      // 清理 Live2D
      const waifu = document.getElementById('waifu');
      if (waifu) {
        waifu.remove();
      }
    };
  }, []);

  return <Live2DContainer ref={containerRef} />;
};

export default Live2D;
