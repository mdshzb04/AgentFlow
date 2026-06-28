"""Fernet-based credential encryption."""

from __future__ import annotations

import base64
import hashlib
import json
from typing import Any

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings


class CredentialEncryptionService:
    def __init__(self) -> None:
        settings = get_settings()
        digest = hashlib.sha256(settings.secret_key.encode()).digest()
        self._fernet = Fernet(base64.urlsafe_b64encode(digest))

    def encrypt(self, data: dict[str, Any]) -> str:
        payload = json.dumps(data).encode()
        return self._fernet.encrypt(payload).decode()

    def decrypt(self, ciphertext: str) -> dict[str, Any]:
        try:
            raw = self._fernet.decrypt(ciphertext.encode())
            return json.loads(raw)
        except (InvalidToken, json.JSONDecodeError):
            # Migration placeholder: legacy rows stored as plain JSON
            try:
                parsed = json.loads(ciphertext)
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                pass
            raise ValueError("Unable to decrypt credentials")

    def encrypt_value(self, value: str) -> str:
        return self._fernet.encrypt(value.encode()).decode()

    def decrypt_value(self, ciphertext: str) -> str:
        try:
            return self._fernet.decrypt(ciphertext.encode()).decode()
        except InvalidToken:
            return ciphertext


_encryption_service: CredentialEncryptionService | None = None


def get_encryption_service() -> CredentialEncryptionService:
    global _encryption_service
    if _encryption_service is None:
        _encryption_service = CredentialEncryptionService()
    return _encryption_service
