from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class Message(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str

class Check(BaseModel):
    id: str
    title: str
    verdict: Optional[str] = None
    score: Optional[int] = None
    messages: List[Message] = []
    createdAt: str
    updatedAt: str
    pinned: bool = False
    tags: List[str] = []

class UserPrefs(BaseModel):
    notifMessages: bool = True
    notifUpdates: bool = True
    notifWeekly: bool = False
    soundEnabled: bool = False
    compactMode: bool = False
    codeLineNumbers: bool = True
    streamResponses: bool = True
    saveHistory: bool = True
    language: str = "en"
    fontSize: str = "medium"
    sensitivity: str = "balanced"
    autoScanUrls: bool = True
    trustedSources: List[str] = ["Reuters", "AP", "BBC", "WHO", "CDC"]

class UserProfile(BaseModel):
    id: str
    name: str
    email: str
    avatar: str
    role: str
    status: str
    joinDate: str
    stats: Dict[str, Any]

class User(BaseModel):
    id: str
    profile: UserProfile
    prefs: UserPrefs
