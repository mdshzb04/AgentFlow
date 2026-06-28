"""Structured GraphQL errors."""

from __future__ import annotations

from typing import Any

from graphql import GraphQLError


class AuthenticationError(GraphQLError):
    def __init__(self, message: str = "Authentication required") -> None:
        super().__init__(message, extensions={"code": "UNAUTHENTICATED"})


class NotFoundError(GraphQLError):
    def __init__(self, resource: str, identifier: str | None = None) -> None:
        detail = f"{resource} not found"
        if identifier:
            detail = f"{resource} '{identifier}' not found"
        super().__init__(detail, extensions={"code": "NOT_FOUND", "resource": resource})


class ValidationError(GraphQLError):
    def __init__(self, message: str, *, field: str | None = None) -> None:
        extensions: dict[str, Any] = {"code": "BAD_USER_INPUT"}
        if field:
            extensions["field"] = field
        super().__init__(message, extensions=extensions)


def service_error(message: str, *, code: str = "INTERNAL_SERVER_ERROR") -> GraphQLError:
    return GraphQLError(message, extensions={"code": code})
