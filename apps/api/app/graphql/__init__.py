"""AgentFlow GraphQL API — runs alongside REST at /graphql."""

from app.graphql.schema import schema

__all__ = ["schema"]
