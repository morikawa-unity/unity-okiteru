"""
AWS Cognito JWT検証ユーティリティ
"""
import json
from typing import Dict, Optional
from urllib.request import urlopen

from jose import jwt, JWTError
from fastapi import HTTPException, status

from app.config import settings


class CognitoJWTVerifier:
    """Cognito JWTトークン検証クラス"""

    def __init__(self):
        self.user_pool_id = settings.COGNITO_USER_POOL_ID
        self.region = settings.COGNITO_REGION
        self.client_id = settings.COGNITO_CLIENT_ID
        self.keys: Optional[Dict] = None

    def get_jwks(self) -> Dict:
        """
        Cognitoの公開鍵（JWKS）を取得

        Returns:
            Dict: JWKS（JSON Web Key Set）
        """
        if self.keys:
            return self.keys

        # Cognitoの公開鍵エンドポイント
        jwks_url = (
            f"https://cognito-idp.{self.region}.amazonaws.com/"
            f"{self.user_pool_id}/.well-known/jwks.json"
        )

        try:
            with urlopen(jwks_url) as response:
                self.keys = json.loads(response.read())
            return self.keys
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"公開鍵の取得に失敗しました: {str(e)}",
            )

    def verify_token(self, token: str) -> Dict:
        """
        Cognito IDトークンを検証

        Args:
            token: Cognito IDトークン

        Returns:
            Dict: デコードされたトークンペイロード

        Raises:
            HTTPException: トークンが無効な場合
        """
        try:
            # JWTヘッダーからkid（Key ID）を取得
            headers = jwt.get_unverified_header(token)
            kid = headers.get("kid")

            if not kid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="トークンのヘッダーにkidがありません",
                )

            # JWKS（公開鍵セット）を取得
            jwks = self.get_jwks()
            keys = jwks.get("keys", [])

            # kidに一致する公開鍵を検索
            public_key = None
            for key in keys:
                if key.get("kid") == kid:
                    public_key = key
                    break

            if not public_key:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="一致する公開鍵が見つかりません",
                )

            # JWTトークンを検証・デコード
            payload = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                audience=self.client_id,  # クライアントIDを検証
                options={"verify_exp": True},  # 有効期限を検証
            )

            # issuer（発行者）を検証
            expected_issuer = (
                f"https://cognito-idp.{self.region}.amazonaws.com/{self.user_pool_id}"
            )
            if payload.get("iss") != expected_issuer:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="トークンの発行者が無効です",
                )

            # token_useがidであることを確認（IDトークン）
            if payload.get("token_use") != "id":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="IDトークンを使用してください",
                )

            return payload

        except JWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"トークンの検証に失敗しました: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"認証エラー: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )


# シングルトンインスタンス
cognito_verifier = CognitoJWTVerifier()
