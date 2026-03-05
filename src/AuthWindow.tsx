import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { parseUrl } from './utils';
import { getAccessToken } from './utils/request';

const Container = styled.div`
  box-sizing: border-box;
  * {
    box-sizing: border-box;
  }
`;

const InitingWrapper = styled.div`
  padding: 1.25em 0;
  text-align: center;
`;

const InitingText = styled.p`
  margin: 0.5em auto;
  color: #999;
`;

const squareAnimation = keyframes`
  0% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(180deg);
  }
  50% {
    transform: rotate(180deg);
  }
  75% {
    transform: rotate(360deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const loaderInnerAnimation = keyframes`
  0% {
    height: 0%;
  }
  25% {
    height: 0%;
  }
  50% {
    height: 100%;
  }
  75% {
    height: 100%;
  }
  100% {
    height: 0%;
  }
`;

const SquareLoader = styled.span`
  display: inline-block;
  width: 2em;
  height: 2em;
  position: relative;
  border: 4px solid #ccc;
  border-radius: 10%;
  box-shadow: inset 0px 0px 20px 20px #ebebeb33;
  animation: ${squareAnimation} 2s infinite ease;
`;

const SquareInner = styled.span`
  vertical-align: top;
  display: inline-block;
  width: 100% !important;
  background-color: #ccc;
  box-shadow: 0 0 5px 0px #ccc;
  animation: ${loaderInnerAnimation} 2s infinite ease-in;
`;

const AuthWindow = () => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!window.opener) {
      console.error('No opener window found');
      return;
    }

    const code = parseUrl().code;
    if (!code) {
      window.opener.postMessage(
        JSON.stringify({
          error: 'No authorization code received',
        }),
        window.opener.location,
      );
      return;
    }

    getAccessToken(code)
      .then((res) => {
        window.opener.postMessage(
          JSON.stringify({
            result: res,
          }),
          window.opener.location,
        );
      })
      .catch((err) => {
        window.opener.postMessage(
          JSON.stringify({
            error: err.message || 'Failed to get access token',
          }),
          window.opener.location,
        );
        console.error(err);
      });
  }, []);

  return (
    <Container>
      <InitingWrapper>
        <SquareLoader>
          <SquareInner />
        </SquareLoader>
        <InitingText>{t('auth.authorizing')}</InitingText>
      </InitingWrapper>
    </Container>
  );
};

export default AuthWindow;
