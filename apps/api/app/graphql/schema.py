"""Root GraphQL schema for AgentFlow CRM."""

from __future__ import annotations

import strawberry
from strawberry.fastapi import GraphQLRouter

from app.core.config import get_settings
from app.graphql.context import get_graphql_context
from app.graphql.mutations import Mutation
from app.graphql.queries import Query

settings = get_settings()

schema = strawberry.Schema(
    query=Query,
    mutation=Mutation,
    config=strawberry.schema.config.StrawberryConfig(auto_camel_case=True),
)

graphql_router = GraphQLRouter(
    schema,
    context_getter=get_graphql_context,
    graphql_ide="graphiql" if settings.is_development else None,
)

__all__ = ["schema", "graphql_router"]
