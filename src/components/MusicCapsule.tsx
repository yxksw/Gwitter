import styled from '@emotion/styled';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import config from '../config';
import axios from 'axios';
import './music-capsule.css';

const MusicContainer = styled.div`
  display: flex;
  align-items: center;
  position: fixed;
  z-index: 10000;
  bottom: 10px;
  left: 10px;
  cursor: pointer;
  transition: all 0.5s, left 0s;
  transform-origin: left bottom;
  border-radius: 40px;
  overflow: hidden;
  background: var(--theme-bg-card, hsla(0, 0%, 100%, 0.8));
  border: 1px solid var(--theme-bg-border-strong, #e1e8ed);
  box-shadow: var(--theme-shadow-sm, 0 0.1em 0.2em 0 rgba(234, 234, 234, 0.8));
  height: 40px;
  padding: 0 12px 0 4px;
  gap: 8px;

  &:active {
    transform: scale(0.97);
  }

  &.playing {
    background: var(--theme-accent-primary, #1d9bf0);
    border-color: var(--theme-accent-primary, #1d9bf0);
    animation: playingShadow 5s linear infinite;
  }

  [data-theme='dark'] & {
    background: var(--theme-bg-card, rgba(31, 35, 40, 0.85));
    border-color: var(--theme-bg-border-strong, #3d454e);
    box-shadow: 0 0.1em 0.2em 0 rgba(0, 0, 0, 0.4);

    &.playing {
      background: var(--theme-accent-primary, #1d9bf0);
      border-color: var(--theme-accent-primary, #1d9bf0);
    }
  }
`;

const AlbumCover = styled.div<{ $isPlaying: boolean; $coverUrl: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-image: url(${props => props.$coverUrl});
  background-size: cover;
  background-position: center;
  position: relative;
  flex-shrink: 0;
  animation: ${props => props.$isPlaying ? 'changeright 24s linear infinite' : 'none'};
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.2);
`;

const PlayButton = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;

  &:hover {
    background: rgba(0, 0, 0, 0.7);
    transform: translate(-50%, -50%) scale(1.1);
  }

  svg {
    width: 10px;
    height: 10px;
    fill: white;
  }
`;

const SongTitle = styled.div<{ $isPlaying: boolean }>`
  font-size: 13px;
  color: ${props => props.$isPlaying ? 'white' : 'var(--theme-text-primary, #0f1419)'};
  white-space: nowrap;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
  font-weight: 500;
  transition: color 0.3s;

  [data-theme='dark'] & {
    color: ${props => props.$isPlaying ? 'white' : 'var(--theme-text-primary, #f7f9f9)'};
  }
`;

const HoverTips = styled.div<{ $isVisible: boolean }>`
  color: white;
  background: var(--theme-accent-primary, #1d9bf0);
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  align-items: center;
  justify-content: center;
  display: flex;
  border-radius: 40px;
  opacity: ${props => props.$isVisible ? 1 : 0};
  font-size: 12px;
  z-index: 2;
  transition: 0.3s;
  pointer-events: none;
`;

const AudioElement = styled.audio`
  display: none;
`;

interface MusicItem {
  title: string;
  author: string;
  url: string;
  pic: string;
  lrc?: string;
}

interface MetingResponse {
  id: string;
  url: string;
  pic: string;
  title: string;
  author: string;
  lrc?: string;
}

const MusicCapsule = () => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [currentSong, setCurrentSong] = useState<MusicItem | null>(null);
  const [playlist, setPlaylist] = useState<MusicItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const musicConfig = config.music;

  const fetchMusicData = useCallback(async () => {
    if (!musicConfig?.id || !musicConfig?.server || !musicConfig?.type) {
      return [];
    }

    const apiUrl = musicConfig.meting_api || 'https://meting.050815.xyz/api';
    const params = new URLSearchParams({
      server: musicConfig.server,
      type: musicConfig.type,
      id: String(musicConfig.id),
      r: Math.random().toString(),
    });

    try {
      const response = await axios.get<MetingResponse[]>(`${apiUrl}?${params}`);
      return response.data.map((item): MusicItem => ({
        title: item.title,
        author: item.author,
        url: item.url,
        pic: item.pic,
        lrc: item.lrc,
      }));
    } catch (error) {
      console.error('Failed to fetch music data:', error);
      return [];
    }
  }, [musicConfig]);

  const playNext = useCallback(() => {
    if (playlist.length === 0) return;
    const nextIndex = (currentIndex + 1) % playlist.length;
    setCurrentIndex(nextIndex);
    setCurrentSong(playlist[nextIndex]);
  }, [playlist, currentIndex]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  useEffect(() => {
    const loadMusic = async () => {
      const musicList = await fetchMusicData();
      if (musicList.length > 0) {
        setPlaylist(musicList);
        setCurrentSong(musicList[0]);
      }
    };

    if (musicConfig?.enable) {
      loadMusic();
    }
  }, [musicConfig?.enable, fetchMusicData]);

  useEffect(() => {
    if (audioRef.current && currentSong) {
      audioRef.current.src = currentSong.url;
      audioRef.current.volume = musicConfig?.volume || 0.8;
      if (isPlaying) {
        audioRef.current.play();
      }
    }
  }, [currentSong, musicConfig?.volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      playNext();
    };

    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [playNext]);

  const handleContainerClick = useCallback(() => {
    if (!isPlaying) {
      togglePlay();
    }
  }, [isPlaying, togglePlay]);

  const handleButtonClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    togglePlay();
  }, [togglePlay]);

  if (!musicConfig?.enable) {
    return null;
  }

  if (!currentSong) {
    return null;
  }

  return (
    <MusicContainer
      ref={containerRef}
      className={`nav-music ${isPlaying ? 'playing' : ''}`}
      onClick={handleContainerClick}
      onMouseEnter={() => !isPlaying && setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <HoverTips $isVisible={isHovering && !isPlaying}>
        {t('music.hit')}
      </HoverTips>
      
      <AlbumCover 
        $isPlaying={isPlaying} 
        $coverUrl={currentSong.pic}
      >
        <PlayButton onClick={handleButtonClick}>
          {isPlaying ? (
            <svg viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </PlayButton>
      </AlbumCover>
      
      <SongTitle $isPlaying={isPlaying}>
        {currentSong.title}
      </SongTitle>
      
      <AudioElement
        ref={audioRef}
        preload="none"
      />
    </MusicContainer>
  );
};

export default MusicCapsule;
