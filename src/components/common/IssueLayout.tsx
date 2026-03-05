import styled from '@emotion/styled';

export const IssueContainer = styled.div`
  position: relative;
  margin: 0.5em 0;
  display: flex;
  border-radius: 10px;
`;

export const IssueContent = styled.div`
  flex: 1 1;
  padding: 16px 20px 0px;
  margin: 6px;
  overflow: auto;
  background: var(--theme-bg-card);
  border: 0.5px solid var(--theme-bg-border);
  border-radius: 10px;
  box-shadow: var(--theme-shadow-sm);
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  position: relative;
  overflow: hidden;
  font-size: 15px;
  z-index: 2;
`;

export const IssueHeader = styled.div`
  margin-bottom: 0.7em;
  font-size: 1em;
  position: relative;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
`;

export const IssueBody = styled.div`
  color: var(--theme-text-primary);
  &.markdown-body {
    font-size: 1em;
    letter-spacing: 0.2px;
    word-wrap: break-word;
    background-color: var(--theme-markdown-bg);
    ol {
      list-style: decimal !important;
    }
    ul {
      list-style: circle !important;
    }
  }
`;

export const IssueFooter = styled.div`
  position: relative;
  margin-top: 0.8em;
  font-size: 1em;
  user-select: none;
`;
