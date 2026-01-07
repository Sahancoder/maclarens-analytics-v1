"""
GraphQL Schema Definition
"""
import strawberry
from strawberry.fastapi import GraphQLRouter
from typing import Optional

from src.gql_schema.resolvers.auth import AuthQuery, AuthMutation
from src.gql_schema.resolvers.admin import AdminQuery, AdminMutation
from src.gql_schema.resolvers.analytics import AnalyticsQuery, AnalyticsMutation
from src.gql_schema.resolvers.reports import ReportQuery, ReportMutation


@strawberry.type
class Query(AuthQuery, AdminQuery, AnalyticsQuery, ReportQuery):
    """Root Query combining all resolvers"""
    
    @strawberry.field
    def health(self) -> str:
        return "GraphQL API is healthy"


@strawberry.type
class Mutation(AuthMutation, AdminMutation, AnalyticsMutation, ReportMutation):
    """Root Mutation combining all resolvers"""
    pass


# Create schema
schema = strawberry.Schema(query=Query, mutation=Mutation)


async def get_context(db, user=None):
    """Create GraphQL context with database session and user"""
    return {
        "db": db,
        "user": user
    }
