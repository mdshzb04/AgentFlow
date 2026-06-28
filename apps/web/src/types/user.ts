export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  github_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  access_token: string;
  token_type: string;
  user: User;
}
