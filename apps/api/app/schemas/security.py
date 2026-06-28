from pydantic import BaseModel, EmailStr, Field


class GitHubLoginInitRequest(BaseModel):
    pass


class GitHubLoginInitResponse(BaseModel):
    redirect_url: str


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class MessageResponse(BaseModel):
    message: str


class ContactRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    subject: str = Field(min_length=1, max_length=255)
    message: str = Field(min_length=10, max_length=5000)


class PublicWebhookRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    use_case: str | None = Field(default=None, max_length=2000)


class PublicWebhookResponse(BaseModel):
    id: str
    message: str
