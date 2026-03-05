import styled from '@emotion/styled';
import {
  IssueBody,
  IssueContent,
  IssueFooter,
  IssueHeader,
} from './common/IssueLayout';

const SkeletonBase = styled.div`
  background: linear-gradient(90deg, var(--theme-skeleton-base) 25%, var(--theme-skeleton-shine) 50%, var(--theme-skeleton-base) 75%);
  background-size: 200px 100%;
  animation: skeleton-loading 3s infinite;
  border-radius: 4px;
  margin-bottom: 8px;

  @keyframes skeleton-loading {
    0% {
      background-position: -200px 0;
    }
    100% {
      background-position: calc(200px + 100%) 0;
    }
  }
`;

const SkeletonAvatar = styled(SkeletonBase)`
  width: 2em;
  height: 2em;
  border-radius: 50%;
  margin-right: 0.5em;
  margin-bottom: 0;
  display: inline-flex;
  align-self: center;
`;

const SkeletonUsername = styled(SkeletonBase)`
  width: 120px;
  height: 20px;
  display: inline-flex;
  align-self: center;
  margin-bottom: 0;
`;

const SkeletonDate = styled(SkeletonBase)`
  width: 80px;
  height: 16px;
  display: inline-flex;
  align-self: center;
  margin-bottom: 0;
  margin-left: 20px;
`;

const SkeletonLabel = styled(SkeletonBase)`
  width: 60px;
  height: 24px;
  position: absolute;
  right: 0;
  top: 0;
`;

const SkeletonLine = styled(SkeletonBase)<{ width: string }>`
  height: 16px;
  margin-top: 12px;
  width: ${(props) => props.width};
`;

const SkeletonInteractions = styled(SkeletonBase)`
  width: 100px;
  height: 20px;
  margin: 16px 0px;
`;

export const SkeletonContainer = styled.div`
  position: relative;
  margin-bottom: 0.5em;
  display: flex;
  border-radius: 10px;
`;

export const SkeletonCard = () => (
  <SkeletonContainer>
    <IssueContent>
      <IssueHeader>
        <SkeletonAvatar />
        <SkeletonUsername />
        <SkeletonDate />
        <SkeletonLabel />
      </IssueHeader>
      <IssueBody>
        <SkeletonLine width="95%" />
        <SkeletonLine width="85%" />
        <SkeletonLine width="75%" />
        <SkeletonLine width="65%" />
      </IssueBody>
      <IssueFooter>
        <SkeletonInteractions />
      </IssueFooter>
    </IssueContent>
  </SkeletonContainer>
);

export default SkeletonCard;
