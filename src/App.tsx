import styled from '@emotion/styled';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import About from './components/About';
import AnimatedCard from './components/AnimatedCard';
import Egg from './components/Egg';
import Issue from './components/Issue';
import Live2D from './components/Live2D';
import MusicCapsule from './components/MusicCapsule';
import SkeletonCard from './components/SkeletonCard';
import ThemeToggle from './components/ThemeToggle';
import Toolbar from './components/Toolbar';
import config from './config';

import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import {
  getRepoFromUrl,
  ProcessedIssue,
  transformIssues,
  updateUrlParams,
} from './utils';
import { loadLastRepo, saveLastRepo } from './utils/cache';
import { api, getIssuesQL } from './utils/request';

const Container = styled.div`
  box-sizing: border-box;
  * {
    box-sizing: border-box;
  }
`;

const IssuesContainer = styled.div`
  /* letter-spacing: 1px; */
`;

const LoadingPlaceholder = styled(motion.div)`
  min-height: 200px;
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
`;

const ErrorIcon = styled.span`
  font-size: 24px;
  margin-bottom: 10px;
`;

const ErrorText = styled.span`
  font-size: 18px;
  font-weight: bold;
`;

const ErrorSubText = styled.span`
  font-size: 14px;
  color: #666;
`;

const EmptyStateContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  min-height: 300px;
`;

const EmptyStateIcon = styled.span`
  font-size: 48px;
  margin-bottom: 20px;
  opacity: 0.6;
`;

const EmptyStateTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 10px 0;
  color: #333;
`;

const App = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState<ProcessedIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRepoLoading, setIsRepoLoading] = useState(true);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [rawIssuesData, setRawIssuesData] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentRepo, setCurrentRepo] = useState(() => {
    if (config.app.enableRepoSwitcher) {
      const urlRepo = getRepoFromUrl();
      if (urlRepo) {
        return urlRepo;
      }

      const lastRepo = loadLastRepo();
      if (lastRepo) {
        return lastRepo;
      }
    }

    if (config.request.owner && config.request.repo) {
      return { owner: config.request.owner, repo: config.request.repo };
    }

    return { owner: '', repo: '' };
  });
  const [repoError, setRepoError] = useState<string | null>(null);

  const cursorRef = useRef<string | null>(null);
  const isLoadingRef = useRef(isLoading);
  const lastIssueRef = useRef<HTMLDivElement>(null);
  const currentUserRef = useRef(user?.login);
  const currentRepoRef = useRef(currentRepo);
  const loadMoreTriggeredRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    currentUserRef.current = user?.login;
  }, [user?.login]);

  useEffect(() => {
    currentRepoRef.current = currentRepo;
  }, [currentRepo]);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
  }, []);

  const loadIssues = useCallback(async () => {
    const repo = currentRepoRef.current;
    console.log(
      'loadIssues called for repo:',
      `${repo.owner}/${repo.repo}`,
      'cursor:',
      cursorRef.current,
      'isLoading:',
      isLoadingRef.current,
    );
    try {
      const res = await api.post(
        '/graphql',
        getIssuesQL({
          owner: repo.owner,
          repo: repo.repo,
          cursor: cursorRef.current,
          pageSize: config.request.pageSize || 6,
        }),
      );
      const data = res.data.data.repository.issues;
      const { hasNextPage: nextPage, endCursor } = data.pageInfo;

      setHasNextPage(nextPage);
      cursorRef.current = endCursor;

      const newRawIssuesData = [...rawIssuesData, ...data.nodes];
      setRawIssuesData(newRawIssuesData);

      setIssues((prev) => [
        ...prev,
        ...transformIssues(data.nodes, currentUserRef.current),
      ]);

      setIsLoading(false);
      loadMoreTriggeredRef.current = false;
    } catch (err) {
      console.error('err:', err);
      setIsLoading(false);
      loadMoreTriggeredRef.current = false;
    }
  }, [rawIssuesData]);

  const resetAndLoadNewRepo = useCallback(async () => {
    console.log('Resetting and loading new repo:', currentRepo);

    // 检查 owner 和 repo 是否为空
    if (!currentRepo.owner || !currentRepo.repo) {
      setIsLoading(false);
      setIsRepoLoading(false);
      setRepoError('Repository owner and name are required');
      return;
    }

    setIssues([]);
    setRawIssuesData([]);
    setHasNextPage(true);
    cursorRef.current = null;
    loadMoreTriggeredRef.current = false;
    lastScrollYRef.current = window.scrollY;
    setIsLoading(true);
    setIsRepoLoading(true);
    setRepoError(null);

    try {
      const res = await api.post(
        '/graphql',
        getIssuesQL({
          owner: currentRepo.owner,
          repo: currentRepo.repo,
          cursor: null,
          pageSize: config.request.pageSize || 6,
        }),
      );

      if (res.data.errors) {
        throw new Error(res.data.errors[0]?.message || 'GraphQL Error');
      }

      if (!res.data.data?.repository) {
        throw new Error(
          `Repository ${currentRepo.owner}/${currentRepo.repo} not found or private`,
        );
      }

      const data = res.data.data.repository.issues;
      const { hasNextPage: nextPage, endCursor } = data.pageInfo;

      setHasNextPage(nextPage);
      cursorRef.current = endCursor;
      setRawIssuesData(data.nodes);
      setIssues(transformIssues(data.nodes, currentUserRef.current));

      setIsLoading(false);
      setIsRepoLoading(false);
      setRepoError(null);
    } catch (err) {
      console.error('Error loading new repo:', err);
      setIsLoading(false);
      setIsRepoLoading(false);
      setRepoError(
        err instanceof Error ? err.message : 'Failed to load repository',
      );
    }
  }, [currentRepo.owner, currentRepo.repo]);

  const handleRepoChange = useCallback((owner: string, repo: string) => {
    console.log('Repo changed to:', { owner, repo });
    setCurrentRepo({ owner, repo });
    if (config.app.enableRepoSwitcher) {
      saveLastRepo(owner, repo);
      updateUrlParams(owner, repo);
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const currentScrollY = window.scrollY;
      const lastScrollY = lastScrollYRef.current;

      const isScrollingDown = currentScrollY > lastScrollY;
      lastScrollYRef.current = currentScrollY;

      console.log(
        'handleScroll check - scrollY:',
        currentScrollY,
        'lastScrollY:',
        lastScrollY,
        'scrollingDown:',
        isScrollingDown,
        'isLoading:',
        isLoadingRef.current,
        'hasNextPage:',
        hasNextPage,
        'triggered:',
        loadMoreTriggeredRef.current,
      );

      if (!isScrollingDown) {
        console.log('handleScroll blocked - scrolling up');
        return;
      }

      if (
        isLoadingRef.current ||
        !hasNextPage ||
        loadMoreTriggeredRef.current
      ) {
        console.log(
          'handleScroll blocked - already loading, no more pages, or already triggered',
        );
        return;
      }

      if (issues.length === 0) {
        console.log('handleScroll blocked - no issues loaded yet');
        return;
      }

      const lastIssueElement = lastIssueRef.current;
      if (!lastIssueElement) {
        console.log('handleScroll blocked - no last issue element');
        return;
      }

      const rect = lastIssueElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      const isLastIssueVisible = rect.top < viewportHeight;

      console.log(
        'Scroll metrics - lastIssue.top:',
        rect.top,
        'viewportHeight:',
        viewportHeight,
        'isVisible:',
        isLastIssueVisible,
      );

      if (!isLastIssueVisible) {
        console.log('handleScroll blocked - last issue not yet visible');
        return;
      }

      console.log(
        'handleScroll triggered, starting new load for repo:',
        currentRepoRef.current,
      );
      loadMoreTriggeredRef.current = true;
      setIsLoading(true);
      loadIssues();
    }, 200);
  }, [loadIssues, hasNextPage, issues.length]);

  useEffect(() => {
    if (!isInitialized) {
      console.log('App mounted, initializing data load');
      setIsRepoLoading(true);
      resetAndLoadNewRepo();
      setIsInitialized(true);

      if (
        currentRepo.owner &&
        currentRepo.repo &&
        config.app.enableRepoSwitcher
      ) {
        updateUrlParams(currentRepo.owner, currentRepo.repo);
      }
    }
  }, [isInitialized, resetAndLoadNewRepo, currentRepo]);

  useEffect(() => {
    if (isInitialized) {
      window.removeEventListener('scroll', handleScroll);
      setIsRepoLoading(true); // repo 切换时设置 loading
      resetAndLoadNewRepo();
    }
  }, [currentRepo.owner, currentRepo.repo]);

  useEffect(() => {
    // 只有当初始化完成、有下一页、且至少有一些 issues 时才添加滚动监听器
    if (isInitialized && hasNextPage && issues.length > 0) {
      console.log(
        'Preparing to add scroll listener, issues count:',
        issues.length,
      );

      // 延迟添加滚动监听器，等待 DOM 更新完成
      const timeoutId = setTimeout(() => {
        // 再次检查 lastIssueRef 是否已经设置
        if (lastIssueRef.current) {
          console.log('Adding scroll listener, lastIssueRef exists');
          window.addEventListener('scroll', handleScroll, false);
        } else {
          console.log('lastIssueRef still null, will retry on next render');
        }
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('scroll', handleScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = null;
        }
      };
    }
  }, [isInitialized, hasNextPage, handleScroll, issues.length]);

  useEffect(() => {
    if (rawIssuesData.length > 0) {
      setIssues(transformIssues(rawIssuesData, user?.login));
    }
  }, [user?.login, rawIssuesData]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, []);

  return (
    <Container>
      <Toolbar
        onRepoChange={handleRepoChange}
        currentRepo={currentRepo}
        isLoading={isRepoLoading}
        error={repoError}
      />
      {config.app.enableAbout && (
        <About owner={currentRepo.owner} repo={currentRepo.repo} />
      )}
      {issues.length > 0 && (
        <>
          <IssuesContainer>
            <AnimatePresence mode="popLayout">
              {issues.map((issue, index) => (
                <AnimatedCard key={issue.id} id={issue.id}>
                  <div
                    ref={index === issues.length - 1 ? lastIssueRef : undefined}
                  >
                    <Issue
                      issue={issue}
                      repoOwner={currentRepo.owner}
                      repoName={currentRepo.repo}
                    />
                  </div>
                </AnimatedCard>
              ))}
            </AnimatePresence>
          </IssuesContainer>
        </>
      )}
      {issues.length === 0 && !isLoading && !isRepoLoading && !repoError && currentRepo.owner && currentRepo.repo && (
        <IssuesContainer>
          <EmptyStateContainer>
            <EmptyStateIcon>📝</EmptyStateIcon>
            <EmptyStateTitle>No Issues Found</EmptyStateTitle>
          </EmptyStateContainer>
        </IssuesContainer>
      )}
      {hasNextPage && (
        <LoadingPlaceholder
          initial={{ opacity: 0, y: 20 }}
          animate={
            isLoading
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: 20 }
          }
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          <SkeletonCard />
          <SkeletonCard />
        </LoadingPlaceholder>
      )}
      {repoError && (
        <IssuesContainer>
          <ErrorContainer>
            <ErrorIcon>⚠️</ErrorIcon>
            <ErrorText>{repoError}</ErrorText>
            <ErrorSubText>
              Please check the repository name and try again.
            </ErrorSubText>
          </ErrorContainer>
        </IssuesContainer>
      )}
      {config.app.enableEgg && !hasNextPage && !repoError && <Egg />}
      <ThemeToggle />
      <MusicCapsule />
      <Live2D />
    </Container>
  );
};

const AppWithAuth = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default AppWithAuth;
