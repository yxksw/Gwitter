import styled from '@emotion/styled';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import config from '../config';
import { useAuth } from '../hooks/useAuth';
import { formatDate, processLinksInHTML } from '../utils';
import {
  addCommentToIssue,
  api,
  createAuthenticatedApi,
  deleteComment,
  getIssueCommentsQL,
  updateComment,
} from '../utils/request';
import CommentInput from './CommentInput';

interface Comment {
  id: string;
  author: {
    login: string;
    avatarUrl: string;
  };
  bodyHTML: string;
  createdAt: string;
  updatedAt?: string;
}

interface CommentListProps {
  issueNumber: number;
  issueId: string;
  isVisible: boolean;
  commentCount: number;
  onCommentCountChange?: (count: number) => void;
  repoOwner?: string;
  repoName?: string;
}

const CommentsContainer = styled.div<{ isVisible: boolean }>`
  max-height: ${(props) => (props.isVisible ? '85vh' : '0')};
  overflow: hidden;
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-top: ${(props) => (props.isVisible ? `1px solid var(--theme-bg-border-strong)` : 'none')};
  margin-top: ${(props) => (props.isVisible ? '16px' : '0')};
  background: var(--theme-bg-primary);
  will-change: max-height;
  contain: layout style;

  @media (max-width: 768px) {
    max-height: ${(props) => (props.isVisible ? '75vh' : '0')};
  }

  @media (max-width: 479px) {
    max-height: ${(props) => (props.isVisible ? '65vh' : '0')};
  }
`;

const CommentsContent = styled.div<{ isVisible: boolean }>`
  opacity: ${(props) => (props.isVisible ? '1' : '0')};
  transform: ${(props) =>
    props.isVisible ? 'translateY(0)' : 'translateY(-8px)'};
  transition:
    opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)
      ${(props) => (props.isVisible ? '0.1s' : '0s')},
    transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)
      ${(props) => (props.isVisible ? '0.1s' : '0s')};
  will-change: opacity, transform;
  padding: 16px 0 0;
  contain: layout style;
`;

const CommentsScrollArea = styled.div`
  max-height: calc(85vh - 220px);
  overflow-y: auto;
  padding-right: 4px;

  @media (max-width: 768px) {
    max-height: calc(75vh - 200px);
  }

  @media (max-width: 479px) {
    max-height: calc(65vh - 180px);
  }

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: var(--theme-scrollbar-track);
  }

  &::-webkit-scrollbar-thumb {
    background: var(--theme-scrollbar-thumb);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: var(--theme-scrollbar-thumb-hover);
  }
`;

const CommentItem = styled.div`
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--theme-bg-border);

  &:hover {
    background-color: var(--theme-bg-hover);
    .markdown-body {
      background-color: var(--theme-bg-hover);
    }
  }

  &:last-child {
    border-bottom: none;
    margin-bottom: 4px;
  }
`;

const CommentAvatar = styled.img`
  width: 2em;
  height: 2em;
  border-radius: 50%;
  flex-shrink: 0;

  @media (max-width: 479px) {
    width: 1.5em;
    height: 1.5em;
  }
`;

const CommentContent = styled.div`
  flex: 1;
  min-width: 0;
  position: relative;
`;

const CommentHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
`;

const CommentAuthor = styled.a`
  font-weight: 700;
  color: var(--theme-text-link-hover);
  font-size: 15px;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
    cursor: pointer;
  }
`;

const CommentDate = styled.span`
  color: var(--theme-text-quaternary);
  text-shadow:
    var(--theme-bg-tertiary) 0 0 1px,
    var(--theme-bg-primary) 0 0 1px,
    var(--theme-bg-primary) 0 0 2px;
  font-size: 0.9em;

  &::before {
    content: '·';
    margin: 0 4px;
  }
`;

const CommentBody = styled.div`
  color: var(--theme-text-primary);
  word-wrap: break-word;
  margin-bottom: 12px;
  font-size: 1em;
  letter-spacing: 0.2px;

  &.markdown-body {
    font-size: 1em;
  }
`;

const CommentActions = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
`;

const ActionButton = styled.button<{ variant?: 'edit' | 'delete' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
  height: 28px;
  min-width: 28px;

  ${(props) =>
    props.variant === 'edit'
      ? `
    color: var(--theme-accent-primary);
    &:hover {
      background: rgba(29, 155, 240, 0.1);
    }
  `
      : props.variant === 'delete'
        ? `
    color: var(--theme-accent-danger);
    &:hover {
      background: rgba(244, 33, 46, 0.1);
    }
  `
        : `
    color: var(--theme-text-secondary);
    &:hover {
      background: var(--theme-bg-hover);
    }
  `}

  svg {
    width: 14px;
    height: 14px;
  }
`;

// 更新 CommentItem 以包含 ActionButton 的悬停效果
const CommentItemWithHover = styled(CommentItem)`
  &:hover {
    background-color: var(--theme-bg-hover);
    .markdown-body {
      background-color: var(--theme-bg-hover);
    }

    .comment-actions {
      opacity: 1;
    }
  }
`;

const LoadingText = styled.div`
  text-align: center;
  color: var(--theme-text-tertiary);
  padding: 32px 20px;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &::before {
    content: '';
    width: 16px;
    height: 16px;
    border: 2px solid var(--theme-bg-border-strong);
    border-top: 2px solid var(--theme-accent-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const CommentInputWrapper = styled.div<{ isVisible: boolean }>`
  padding: 0 16px;
  padding-bottom: ${(props) => (props.isVisible ? '16px' : '0')};
  max-height: ${(props) => (props.isVisible ? '200px' : '0')};
  overflow: hidden;
  transition: max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: max-height;
  contain: layout;
`;

const UpdatedIndicator = styled.span`
  color: #536471;
  font-size: 13px;
  font-weight: 400;
  margin-left: 4px;
`;

// 确认删除对话框样式
const ConfirmOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--theme-overlay-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  opacity: ${(props) => (props.isOpen ? '1' : '0')};
  visibility: ${(props) => (props.isOpen ? 'visible' : 'hidden')};
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: var(--theme-overlay-blur);
`;

const ConfirmDialog = styled.div<{ isOpen: boolean }>`
  background: var(--theme-bg-primary);
  border-radius: 16px;
  padding: 24px;
  max-width: 360px;
  width: 90%;
  box-shadow: var(--theme-shadow-xl);
  transform: ${(props) =>
    props.isOpen ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-8px)'};
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
`;

const ConfirmTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--theme-text-primary);
  line-height: 1.3;
`;

const ConfirmMessage = styled.p`
  margin: 0 0 20px 0;
  font-size: 15px;
  color: var(--theme-text-secondary);
  line-height: 1.4;
`;

const ConfirmButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const ConfirmButton = styled.button<{ variant?: 'danger' | 'cancel' }>`
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  min-width: 70px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;

  ${(props) =>
    props.variant === 'danger'
      ? `
    background: var(--theme-accent-danger);
    color: white;

    &:hover:not(:disabled) {
      background: var(--theme-accent-danger-hover);
    }

    &:disabled {
      background: rgba(244, 33, 46, 0.5);
      cursor: not-allowed;
    }
  `
      : `
    background: transparent;
    color: var(--theme-text-primary);
    border: 1px solid var(--theme-bg-border-strong);

    &:hover {
      background: var(--theme-bg-hover);
      border-color: var(--theme-text-tertiary);
    }
  `}
`;

const CommentList: React.FC<CommentListProps> = ({
  issueNumber,
  issueId,
  isVisible,
  commentCount,
  onCommentCountChange,
  repoOwner = config.request.owner,
  repoName = config.request.repo,
}) => {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, user, token } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 当 repo 切换时重置状态
  useEffect(() => {
    setComments([]);
    setLoaded(false);
    setEditingCommentId(null);
    setConfirmDeleteId(null);
    setIsDeleting(false);
  }, [repoOwner, repoName, issueNumber]);

  useEffect(() => {
    if (isVisible && !loaded) {
      loadComments();
    }
  }, [isVisible, loaded, repoOwner, repoName]);

  useEffect(() => {
    if (confirmDeleteId) {
      const handleScroll = () => {
        setConfirmDeleteId(null);
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      document.addEventListener('scroll', handleScroll, { passive: true });

      return () => {
        window.removeEventListener('scroll', handleScroll);
        document.removeEventListener('scroll', handleScroll);
      };
    }
  }, [confirmDeleteId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const response = await api.post(
        '/graphql',
        getIssueCommentsQL({
          owner: repoOwner,
          repo: repoName,
          issueNumber,
        }),
      );

      const commentsData = response.data.data.repository.issue.comments.nodes;
      setComments(commentsData);
      setLoaded(true);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (content: string) => {
    if (!isAuthenticated || !token) {
      throw new Error(t('interaction.loginRequired'));
    }

    try {
      const authenticatedApi = createAuthenticatedApi(token);
      const response = await addCommentToIssue(
        authenticatedApi,
        issueId,
        content,
      );

      const newComment = response.data.data.addComment.commentEdge.node;
      setComments((prev) => {
        const newComments = [...prev, newComment];
        onCommentCountChange?.(newComments.length);
        return newComments;
      });
    } catch (err) {
      console.error('Failed to add comment:', err);
      throw new Error(t('comments.addFailed'));
    }
  };

  const handleUpdateComment = async (commentId: string, content: string) => {
    if (!isAuthenticated || !token) {
      throw new Error(t('interaction.loginRequired'));
    }

    try {
      const authenticatedApi = createAuthenticatedApi(token);
      const response = await updateComment(
        authenticatedApi,
        commentId,
        content,
      );

      const updatedComment = response.data.data.updateIssueComment.issueComment;
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId ? updatedComment : comment,
        ),
      );

      setEditingCommentId(null);
    } catch (err) {
      console.error('Failed to update comment:', err);
      throw new Error(t('comments.updateFailed'));
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!isAuthenticated || !token) {
      return;
    }

    setIsDeleting(true);
    try {
      const authenticatedApi = createAuthenticatedApi(token);
      await deleteComment(authenticatedApi, commentId);

      setComments((prev) => {
        const newComments = prev.filter((comment) => comment.id !== commentId);
        onCommentCountChange?.(newComments.length);
        return newComments;
      });

      setConfirmDeleteId(null);
    } catch (err) {
      console.error('Failed to delete comment:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const showDeleteConfirm = (commentId: string) => {
    setConfirmDeleteId(commentId);
  };

  const cancelDelete = () => {
    setConfirmDeleteId(null);
  };

  const canEditComment = (comment: Comment) => {
    return isAuthenticated && user && comment.author.login === user.login;
  };

  const getCommentBodyText = (bodyHTML: string) => {
    const div = document.createElement('div');
    div.innerHTML = bodyHTML;
    return div.textContent || div.innerText || '';
  };

  return (
    <>
      <CommentsContainer isVisible={isVisible}>
        <CommentsContent isVisible={isVisible}>
          <CommentInputWrapper isVisible={isVisible}>
            <CommentInput
              onSubmit={handleAddComment}
              placeholder={t('comments.placeholder')}
              submitText={t('comments.add')}
            />
          </CommentInputWrapper>

          {loading && commentCount > 0 && (
            <LoadingText>{t('comments.loading')}</LoadingText>
          )}

          {!loading && comments.length > 0 && (
            <CommentsScrollArea>
              {comments.map((comment) => {
                return (
                  <CommentItemWithHover key={comment.id}>
                    <CommentAvatar
                      src={comment.author.avatarUrl}
                      alt={comment.author.login}
                    />
                    <CommentContent>
                      <CommentHeader>
                        <CommentAuthor
                          href={`https://github.com/${comment.author.login}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {comment.author.login}
                        </CommentAuthor>
                        <CommentDate>
                          {formatDate(comment.createdAt, i18n.language)}
                        </CommentDate>
                        {/* {comment.updatedAt &&
                          comment.updatedAt !== comment.createdAt && (
                            <UpdatedIndicator>
                              · {t('comments.edit')}
                            </UpdatedIndicator>
                          )} */}
                      </CommentHeader>

                      {editingCommentId === comment.id ? (
                        <CommentInput
                          onSubmit={(content) =>
                            handleUpdateComment(comment.id, content)
                          }
                          onCancel={() => setEditingCommentId(null)}
                          initialValue={getCommentBodyText(comment.bodyHTML)}
                          submitText={t('comments.save')}
                          showCancel={true}
                        />
                      ) : (
                        <>
                          <CommentBody
                            className="markdown-body"
                            dangerouslySetInnerHTML={{
                              __html: processLinksInHTML(comment.bodyHTML),
                            }}
                          />

                          {canEditComment(comment) && (
                            <CommentActions className="comment-actions">
                              <ActionButton
                                variant="edit"
                                onClick={() => setEditingCommentId(comment.id)}
                                title={t('comments.edit')}
                              >
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                                </svg>
                              </ActionButton>
                              <ActionButton
                                variant="delete"
                                onClick={() => showDeleteConfirm(comment.id)}
                                title={t('comments.delete')}
                              >
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                </svg>
                              </ActionButton>
                            </CommentActions>
                          )}
                        </>
                      )}
                    </CommentContent>
                  </CommentItemWithHover>
                );
              })}
            </CommentsScrollArea>
          )}
        </CommentsContent>
      </CommentsContainer>

      {confirmDeleteId &&
        createPortal(
          <ConfirmOverlay isOpen={!!confirmDeleteId} onClick={cancelDelete}>
            <ConfirmDialog
              isOpen={!!confirmDeleteId}
              onClick={(e) => e.stopPropagation()}
            >
              <ConfirmTitle>{t('comments.confirmDeleteTitle')}</ConfirmTitle>
              <ConfirmMessage>
                {t('comments.confirmDeleteMessage')}
              </ConfirmMessage>
              <ConfirmButtons>
                <ConfirmButton variant="cancel" onClick={cancelDelete}>
                  {t('comments.cancel')}
                </ConfirmButton>
                <ConfirmButton
                  variant="danger"
                  onClick={() =>
                    confirmDeleteId && handleDeleteComment(confirmDeleteId)
                  }
                  disabled={isDeleting}
                >
                  {isDeleting ? t('comments.deleting') : t('comments.delete')}
                </ConfirmButton>
              </ConfirmButtons>
            </ConfirmDialog>
          </ConfirmOverlay>,
          document.body,
        )}
    </>
  );
};

export default CommentList;
