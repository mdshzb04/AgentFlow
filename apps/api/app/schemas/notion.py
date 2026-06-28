from typing import Any

from pydantic import BaseModel, Field


class NotionPageCreateRequest(BaseModel):
    parent_id: str = Field(min_length=1)
    title: str = Field(min_length=1, max_length=2000)
    content: str | None = None


class NotionMeetingNotesRequest(BaseModel):
    page_id: str = Field(min_length=1)
    notes: str = Field(min_length=1)
    heading: str = "Meeting Notes"


class NotionSummaryRequest(BaseModel):
    page_id: str = Field(min_length=1)
    summary: str = Field(min_length=1)
    title: str = "AI Summary"


class NotionSyncNoteRequest(BaseModel):
    page_id: str = Field(min_length=1)
    note_title: str = Field(min_length=1)
    note_body: str = Field(min_length=1)
    entity_type: str | None = None
    entity_name: str | None = None


class NotionDatabaseCreateRequest(BaseModel):
    parent_page_id: str = Field(min_length=1)
    title: str = Field(min_length=1, max_length=2000)
    properties: dict[str, Any] | None = None


class NotionDatabaseItemRequest(BaseModel):
    database_id: str = Field(min_length=1)
    properties: dict[str, Any] = Field(default_factory=dict)
    content: str | None = None


class NotionDatabaseUpdateItemRequest(BaseModel):
    page_id: str = Field(min_length=1)
    properties: dict[str, Any] = Field(default_factory=dict)


class NotionActionResponse(BaseModel):
    success: bool
    notion_response: dict[str, Any] = Field(default_factory=dict)
    message: str = "OK"
